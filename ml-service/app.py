from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
import numpy as np

app = Flask(__name__)
CORS(app)

# Ranking and input constraints
MIN_TEXT_CHARS = int(os.getenv("MIN_TEXT_CHARS", "4"))
MAX_TEXT_CHARS = int(os.getenv("MAX_TEXT_CHARS", "1000"))
RANK_TOP_K = int(os.getenv("RANK_TOP_K", "3"))
RANK_MIN_CONF = float(os.getenv("RANK_MIN_CONF", "0.2"))
MAX_SHAP_WORDS = int(os.getenv("MAX_SHAP_WORDS", "12"))

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

candidate_paths = [
    MODEL_PATH,
    os.path.join(os.getcwd(), "model.pkl"),
    "/app/model.pkl",
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "model.pkl"))
]

model_path = next((path for path in candidate_paths if os.path.exists(path)), None)

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
            "ranked_categories": [],
            "shap_values": {}
        }), 200

    text = text[:MAX_TEXT_CHARS]

    try:
        tfidf = model.named_steps['tfidf']
        clf = model.named_steps['clf']

        # Predict category and ranking
        proba = clf.predict_proba(tfidf.transform([text]))[0]
        classes = list(clf.classes_)
        ranked = sorted(zip(classes, proba), key=lambda x: x[1], reverse=True)
        ranked_top = ranked[:max(1, RANK_TOP_K)]

        top_category, top_score = ranked_top[0]
        category = top_category if top_score >= RANK_MIN_CONF else "Unclassified"

        ranked_categories = [
            {"category": c, "score": round(float(s), 4)}
            for c, s in ranked_top
        ]

        # Simple attribution (mock SHAP using feature coefficients for Linear Model)
        words = text.split()
        shap_values = {}

        class_index = classes.index(top_category)
        feature_names = tfidf.get_feature_names_out()

        text_features = tfidf.transform([text]).toarray()[0]
        word_weights = []

        for word in words:
            word_clean = word.strip('.,?!').lower()
            if word_clean in feature_names:
                idx = np.where(feature_names == word_clean)[0][0]
                if text_features[idx] > 0:
                    weight = clf.coef_[class_index][idx] * text_features[idx]
                    word_weights.append((word, float(weight)))

        word_weights.sort(key=lambda x: abs(x[1]), reverse=True)
        for word, weight in word_weights[:MAX_SHAP_WORDS]:
            shap_values[word] = round(weight, 3)

        response_data = {
            "category": category,
            "confidence": round(float(top_score), 4),
            "ranked_categories": ranked_categories,
            "shap_values": shap_values
        }
    except Exception as e:
        print(f"Prediction error: {e}")
        response_data = {
            "category": "Unclassified",
            "confidence": 0.0,
            "ranked_categories": [],
            "shap_values": {}
        }

    return jsonify(response_data)

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "healthy"}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
