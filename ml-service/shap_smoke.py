import os
import joblib

from shap_utils import build_text_explainer, load_shap_background, summarize_shap_values

SAMPLE_TEXT = "pothole near the main road causing traffic"

MODEL_PATH = os.getenv("MODEL_PATH", "model.pkl")
SHAP_BACKGROUND_PATH = os.getenv("SHAP_BACKGROUND_PATH", "shap_background.json")

candidate_paths = [
    MODEL_PATH,
    os.path.join(os.getcwd(), "model.pkl"),
    os.path.join(os.path.dirname(__file__), "model.pkl"),
    os.path.join(os.path.dirname(__file__), "artifacts", "model.pkl"),
    "/app/model.pkl",
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "model.pkl"))
]

shap_background_candidate_paths = [
    SHAP_BACKGROUND_PATH,
    os.path.join(os.getcwd(), "shap_background.json"),
    os.path.join(os.path.dirname(__file__), "shap_background.json"),
    os.path.join(os.path.dirname(__file__), "artifacts", "shap_background.json"),
    "/app/shap_background.json",
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "shap_background.json"))
]

model_path = next((path for path in candidate_paths if os.path.exists(path)), None)
if not model_path:
    raise SystemExit("No model.pkl found. Train first.")

model = joblib.load(model_path)
classes = list(model.named_steps["clf"].classes_)

background_texts = load_shap_background(
    candidate_paths=shap_background_candidate_paths,
    fallback_texts=[SAMPLE_TEXT]
)

explainer = build_text_explainer(model, background_texts, classes)
result = explainer([SAMPLE_TEXT])

proba = model.predict_proba([SAMPLE_TEXT])[0]
class_index = int(proba.argmax())
shap_values, base_value = summarize_shap_values(result, class_index=class_index, max_words=10)

print("Sample text:", SAMPLE_TEXT)
print("Top class:", classes[class_index])
print("Base value:", round(float(base_value), 4))
print("SHAP values:")
for token, value in shap_values.items():
    print(f"  {token}: {value}")


