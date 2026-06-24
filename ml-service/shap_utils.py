import json
import os
import typing

import shap


def load_shap_background(candidate_paths: typing.List[str], fallback_texts: typing.List[str], max_samples: int = 200) -> typing.List[str]:
    for path in candidate_paths:
        if path and os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as handle:
                    payload = json.load(handle)
                if isinstance(payload, list) and payload:
                    return [str(item) for item in payload[:max_samples]]
            except Exception:
                break
    return [str(item) for item in fallback_texts[:max_samples]]


def build_text_explainer(model, background_texts: typing.List[str], output_names: typing.Optional[typing.List[str]] = None):
    # For text explainers, we pass predict_proba and a text masker
    masker = shap.maskers.Text(r"\W")
    return shap.Explainer(model.predict_proba, masker, output_names=output_names)


def summarize_shap_values(shap_values, class_index: int, max_words: int) -> typing.Tuple[dict, float]:
    values = shap_values.values[0]
    tokens = shap_values.data[0]

    if getattr(values, "ndim", 1) > 1:
        class_values = values[:, class_index]
    else:
        class_values = values

    pairs = []
    for token, value in zip(tokens, class_values):
        token_text = str(token).strip()
        if not token_text:
            continue
        pairs.append((token_text, float(value)))

    pairs.sort(key=lambda item: abs(item[1]), reverse=True)
    top_pairs = pairs[:max_words]
    shap_dict = {token: round(weight, 3) for token, weight in top_pairs}

    base_values = shap_values.base_values
    if getattr(base_values, "ndim", 1) > 1:
        base_value = float(base_values[0][class_index])
    else:
        base_value = float(base_values[0])

    return shap_dict, base_value

