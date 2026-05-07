from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from shap_utils import build_text_explainer, load_shap_background, summarize_shap_values

app = Flask(__name__)
CORS(app)

# Ranking and input constraints
MIN_TEXT_CHARS = int(os.getenv("MIN_TEXT_CHARS", "4"))
MAX_TEXT_CHARS = int(os.getenv("MAX_TEXT_CHARS", "1000"))
RANK_TOP_K = int(os.getenv("RANK_TOP_K", "3"))
RANK_MIN_CONF = float(os.getenv("RANK_MIN_CONF", "0.2"))
MAX_SHAP_WORDS = int(os.getenv("MAX_SHAP_WORDS", "12"))
SHAP_ENABLED = os.getenv("SHAP_ENABLED", "true").lower() in {"1", "true", "yes"}
SHAP_BACKGROUND_PATH = os.getenv("SHAP_BACKGROUND_PATH", "shap_background.json")

# Fallback training data
X_train = [
    "pothole in the road", "traffic light is broken", "bad traffic",
    "garbage not collected", "too much waste on street", "overflowing dustbin",
    "no water supply", "pipe is leaking", "no drinking water",
    "street light is off", "dark alley", "broken street lamp",
    "drain is blocked", "sewage overflowing", "street is flooded"
]
y_train = [
    "Roads & Traffic", "Roads & Traffic", "Roads & Traffic",
    "Waste Management", "Waste Management", "Waste Management",
    "Water Supply", "Water Supply", "Water Supply",
    "Streetlights", "Streetlights", "Streetlights",
    "Drainage", "Drainage", "Drainage"
]

MODEL_PATH = os.getenv("MODEL_PATH", "model.pkl")
PRIORITY_MODEL_PATH = os.getenv("PRIORITY_MODEL_PATH", "priority_model.pkl")
BERT_MODEL_NAME = os.getenv("BERT_MODEL_NAME", "all-MiniLM-L6-v2")
BERT_MODEL_PATH = os.getenv("BERT_MODEL_PATH", "bert_model.pkl")
BERT_PRIORITY_MODEL_PATH = os.getenv("BERT_PRIORITY_MODEL_PATH", "bert_priority_model.pkl")
BERT_ENABLED = os.getenv("BERT_ENABLED", "true").lower() in {"1", "true", "yes"}
METRICS_PATH = os.getenv("METRICS_PATH", "metrics.json")

candidate_paths = [
    MODEL_PATH,
    os.path.join(os.getcwd(), "model.pkl"),
    os.path.join(os.path.dirname(__file__), "model.pkl"),
    os.path.join(os.path.dirname(__file__), "artifacts", "model.pkl"),
    "/app/model.pkl",
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "model.pkl"))
]

priority_candidate_paths = [
    PRIORITY_MODEL_PATH,
    os.path.join(os.getcwd(), "priority_model.pkl"),
    os.path.join(os.path.dirname(__file__), "priority_model.pkl"),
    os.path.join(os.path.dirname(__file__), "artifacts", "priority_model.pkl"),
    "/app/priority_model.pkl",
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "priority_model.pkl"))
]

metrics_candidate_paths = [
    METRICS_PATH,
    os.path.join(os.getcwd(), "metrics.json"),
    os.path.join(os.path.dirname(__file__), "metrics.json"),
    os.path.join(os.path.dirname(__file__), "artifacts", "metrics.json"),
    "/app/metrics.json",
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "metrics.json"))
]

shap_background_candidate_paths = [
    SHAP_BACKGROUND_PATH,
    os.path.join(os.getcwd(), "shap_background.json"),
    os.path.join(os.path.dirname(__file__), "shap_background.json"),
    os.path.join(os.path.dirname(__file__), "artifacts", "shap_background.json"),
    "/app/shap_background.json",
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "shap_background.json"))
]

bert_candidate_paths = [
    BERT_MODEL_PATH,
    os.path.join(os.getcwd(), "bert_model.pkl"),
    os.path.join(os.path.dirname(__file__), "bert_model.pkl"),
    os.path.join(os.path.dirname(__file__), "artifacts", "bert_model.pkl"),
    "/app/bert_model.pkl",
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "bert_model.pkl"))
]

bert_priority_candidate_paths = [
    BERT_PRIORITY_MODEL_PATH,
    os.path.join(os.getcwd(), "bert_priority_model.pkl"),
    os.path.join(os.path.dirname(__file__), "bert_priority_model.pkl"),
    os.path.join(os.path.dirname(__file__), "artifacts", "bert_priority_model.pkl"),
    "/app/bert_priority_model.pkl",
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "bert_priority_model.pkl"))
]

model_path = next((path for path in candidate_paths if os.path.exists(path)), None)
priority_model_path = next((path for path in priority_candidate_paths if os.path.exists(path)), None)
bert_model_path = next((path for path in bert_candidate_paths if os.path.exists(path)), None)
bert_priority_model_path = next((path for path in bert_priority_candidate_paths if os.path.exists(path)), None)

if model_path:
    model = joblib.load(model_path)
    print(f"Model loaded from disk: {model_path}")
else:
    print("Training new model...")
    model = Pipeline([
        ('tfidf', TfidfVectorizer(stop_words='english')),
        ('clf', LogisticRegression(random_state=42))
    ])
    model.fit(X_train, y_train)
    joblib.dump(model, MODEL_PATH)

if priority_model_path:
    priority_model = joblib.load(priority_model_path)
    print(f"Priority model loaded from disk: {priority_model_path}")
else:
    priority_model = None

bert_model = None
bert_priority_model = None
bert_embedder = None
_shap_explainer = None
_shap_output_names = None
if BERT_ENABLED and bert_model_path:
    try:
        from sentence_transformers import SentenceTransformer
        bert_embedder = SentenceTransformer(BERT_MODEL_NAME, device="cpu")
        bert_model = joblib.load(bert_model_path)
        print(f"BERT model loaded from disk: {bert_model_path}")
        if bert_priority_model_path:
            bert_priority_model = joblib.load(bert_priority_model_path)
            print(f"BERT priority model loaded from disk: {bert_priority_model_path}")
    except Exception as exc:
        print(f"Failed to load BERT model: {exc}")
        bert_model = None
        bert_priority_model = None
        bert_embedder = None


def build_ranked_categories(classes, scores):
    ranked = sorted(zip(classes, scores), key=lambda x: x[1], reverse=True)
    ranked_top = ranked[:max(1, RANK_TOP_K)]
    ranked_categories = [
        {"category": c, "score": round(float(s), 4)}
        for c, s in ranked_top
    ]
    return ranked_top, ranked_categories


def predict_tfidf(text: str):
    tfidf = model.named_steps['tfidf']
    clf = model.named_steps['clf']
    proba = clf.predict_proba(tfidf.transform([text]))[0]
    classes = list(clf.classes_)
    ranked_top, ranked_categories = build_ranked_categories(classes, proba)
    return {
        "classes": classes,
        "ranked_top": ranked_top,
        "ranked_categories": ranked_categories,
        "classifier": clf,
        "vectorizer": tfidf
    }


def predict_bert(text: str):
    if bert_model is None or bert_embedder is None:
        return None
    embeddings = bert_embedder.encode([text], normalize_embeddings=True)
    proba = bert_model.predict_proba(embeddings)[0]
    classes = list(bert_model.classes_)
    ranked_top, ranked_categories = build_ranked_categories(classes, proba)
    return {
        "classes": classes,
        "ranked_top": ranked_top,
        "ranked_categories": ranked_categories
    }


def predict_priority(text: str):
    if bert_priority_model is not None and bert_embedder is not None:
        embeddings = bert_embedder.encode([text], normalize_embeddings=True)
        priority_probs = bert_priority_model.predict_proba(embeddings)[0]
        priority_classes = list(bert_priority_model.classes_)
        priority_ranked = sorted(zip(priority_classes, priority_probs), key=lambda x: x[1], reverse=True)
        return priority_ranked[0]
    if priority_model:
        priority_tfidf = priority_model.named_steps['tfidf']
        priority_clf = priority_model.named_steps['clf']
        priority_probs = priority_clf.predict_proba(priority_tfidf.transform([text]))[0]
        priority_classes = list(priority_clf.classes_)
        priority_ranked = sorted(zip(priority_classes, priority_probs), key=lambda x: x[1], reverse=True)
        return priority_ranked[0]
    return "MEDIUM", 0.0


def get_shap_explainer(output_names):
    global _shap_explainer, _shap_output_names
    if _shap_explainer is not None and _shap_output_names == output_names:
        return _shap_explainer

    background_texts = load_shap_background(
        candidate_paths=shap_background_candidate_paths,
        fallback_texts=X_train
    )
    _shap_explainer = build_text_explainer(model, background_texts, output_names)
    _shap_output_names = list(output_names)
    return _shap_explainer

@app.route("/predict", methods=["POST"])
def predict():
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400

    data = request.json
    text = str(data.get("text", "")).strip().lower()

    if not text or len(text) < MIN_TEXT_CHARS:
        return jsonify({
            "category": "Unclassified",
            "confidence": 0.0,
            "priority": "MEDIUM",
            "priority_confidence": 0.0,
            "ranked_categories": [],
            "shap_values": {},
            "model_used": "none",
            "model_name": "none"
        }), 200

    text = text[:MAX_TEXT_CHARS]

    try:
        use_bert = bert_model is not None and bert_embedder is not None
        model_used = "bert" if use_bert else "tfidf"

        prediction = predict_bert(text) if use_bert else predict_tfidf(text)
        if prediction is None:
            prediction = predict_tfidf(text)
            model_used = "tfidf"

        ranked_top = prediction["ranked_top"]
        ranked_categories = prediction["ranked_categories"]
        classes = prediction["classes"]

        top_category, top_score = ranked_top[0]
        category = top_category if top_score >= RANK_MIN_CONF else "Unclassified"

        priority, priority_confidence = predict_priority(text)

        shap_values = {}
        shap_base_value = None
        shap_top_class = None

        if SHAP_ENABLED and model_used == "tfidf":
            try:
                explainer = get_shap_explainer(classes)
                shap_result = explainer([text])
                class_index = classes.index(top_category)
                shap_values, shap_base_value = summarize_shap_values(
                    shap_result,
                    class_index=class_index,
                    max_words=MAX_SHAP_WORDS
                )
                shap_top_class = top_category
            except Exception as exc:
                print(f"SHAP generation failed: {exc}")

        response_data = {
            "category": category,
            "confidence": round(float(top_score), 4),
            "priority": priority,
            "priority_confidence": round(float(priority_confidence), 4),
            "ranked_categories": ranked_categories,
            "shap_values": shap_values,
            "shap_base_value": None if shap_base_value is None else round(float(shap_base_value), 4),
            "shap_top_class": shap_top_class,
            "model_used": model_used,
            "model_name": BERT_MODEL_NAME if model_used == "bert" else "tfidf"
        }
    except Exception as e:
        print(f"Prediction error: {e}")
        response_data = {
            "category": "Unclassified",
            "confidence": 0.0,
            "priority": "MEDIUM",
            "priority_confidence": 0.0,
            "ranked_categories": [],
            "shap_values": {},
            "model_used": "none",
            "model_name": "none"
        }

    return jsonify(response_data)

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "model_loaded": model_path is not None,
        "bert_loaded": bert_model is not None
    }), 200


@app.route("/metrics", methods=["GET"])
def metrics():
    metrics_path = next((path for path in metrics_candidate_paths if os.path.exists(path)), None)
    payload = {
        "metrics": {},
        "model_paths": {
            "tfidf": model_path,
            "priority": priority_model_path,
            "bert": bert_model_path,
            "bert_priority": bert_priority_model_path
        }
    }
    if metrics_path:
        try:
            with open(metrics_path, "r", encoding="utf-8") as metrics_file:
                payload["metrics"] = json.load(metrics_file)
                payload["metrics_path"] = metrics_path
        except Exception as exc:
            payload["metrics_error"] = str(exc)
    return jsonify(payload), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
