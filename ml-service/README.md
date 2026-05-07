# ML Service Training

This folder contains the Flask inference app (`app.py`) and the training pipeline (`train.py`) that builds a text classifier from `data.csv`.

## What the training does
- Loads `data.csv`
- Builds a text field from: `Sub Category`, `Ward Name`, `Grievance Status`, `Staff Remarks`, and date tokens from `Grievance Date`
- Trains a TF-IDF + classifier (Logistic Regression by default) to predict `Category`
- Optional: trains a MiniLM (BERT) embedding classifier for CPU-only inference
- Writes artifacts to `artifacts/`

## Quick start
```bash
cd /home/srikanth-r/Desktop/IDP/ml-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python train.py --data-path data.csv
```

Artifacts:
- `artifacts/model.pkl`
- `artifacts/priority_model.pkl`
- `artifacts/bert_model.pkl` (when `--bert` is used)
- `artifacts/bert_priority_model.pkl` (when `--bert` is used)
- `artifacts/shap_background.json`
- `artifacts/metrics.json`
- `artifacts/metadata.json`
- `artifacts/per_class_report.csv`
- `artifacts/confusion_matrix.png`
- `artifacts/priority_per_class_report.csv`
- `artifacts/priority_confusion_matrix.png`

The Flask app looks for the model in `artifacts/model.pkl` or `model.pkl`. You can also set `MODEL_PATH` to an explicit location.
Set `PRIORITY_MODEL_PATH` if you store the priority model elsewhere.
To enable MiniLM inference, export `BERT_ENABLED=true` and place `bert_model.pkl` in `artifacts/`.

API response fields now include `priority` and `priority_confidence` alongside category.

## SHAP explainability
The inference app uses SHAP to explain TF-IDF predictions. Training writes a background sample to
`artifacts/shap_background.json`. You can override the path with `SHAP_BACKGROUND_PATH` or disable
explanations by setting `SHAP_ENABLED=false`.

## Tuning options
```bash
python train.py \
  --model logistic \
  --C 1.0 \
  --class-weight balanced \
  --max-iter 2000 \
  --ngram-max 2 \
  --min-df 2 \
  --max-features 0
```

## MiniLM (BERT) training
```bash
python train.py --data-path data.csv --bert --bert-model-name all-MiniLM-L6-v2
```

## Predict smoke test
```bash
python predict_smoke.py
```

## SHAP smoke test
```bash
python shap_smoke.py
```

For `linear_svc`, the trainer automatically calibrates it to enable probabilities for the API response.

## Smoke run
```bash
cd /home/srikanth-r/Desktop/IDP/ml-service
python train_smoke.py
```

## Notes
- Use `--sample-rows` for quick experiments.
- If the dataset changes, re-run training to refresh the model.
