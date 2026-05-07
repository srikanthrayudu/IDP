#!/usr/bin/env bash
set -euo pipefail

DATA_PATH="${DATA_PATH:-/app/data.csv}"
OUT_DIR="${OUT_DIR:-/app/artifacts}"
MODEL_PATH="${MODEL_PATH:-/app/artifacts/model.pkl}"
PRIORITY_MODEL_PATH="${PRIORITY_MODEL_PATH:-/app/artifacts/priority_model.pkl}"
AUTO_TRAIN="${AUTO_TRAIN:-1}"
TRAIN_ARGS="${TRAIN_ARGS:-}"

if [[ "${AUTO_TRAIN}" == "1" || "${AUTO_TRAIN}" == "true" ]]; then
  if [[ -f "${DATA_PATH}" ]]; then
    echo "Auto-training model from ${DATA_PATH}"
    python /app/train.py --data-path "${DATA_PATH}" --out-dir "${OUT_DIR}" --model-path "${MODEL_PATH}" ${TRAIN_ARGS}
  else
    echo "AUTO_TRAIN enabled but data not found at ${DATA_PATH}"
  fi
fi

exec python /app/app.py
