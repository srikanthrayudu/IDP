from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

from shap_utils import build_text_explainer, load_shap_background, summarize_shap_values


def test_load_shap_background_fallback(tmp_path):
    fallback = ["alpha", "beta", "gamma"]
    result = load_shap_background([str(tmp_path / "missing.json")], fallback)
    assert result == fallback


def test_shap_summary_on_tiny_model():
    texts = ["road pothole", "garbage collection", "water leakage"]
    labels = ["Roads", "Waste", "Water"]
    model = Pipeline([
        ("tfidf", TfidfVectorizer()),
        ("clf", LogisticRegression(max_iter=200))
    ])
    model.fit(texts, labels)

    classes = list(model.named_steps["clf"].classes_)
    explainer = build_text_explainer(model, texts, classes)
    result = explainer(["pothole on road"])

    shap_values, base_value = summarize_shap_values(result, class_index=0, max_words=5)
    assert isinstance(shap_values, dict)
    assert isinstance(base_value, float)

