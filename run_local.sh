#!/usr/bin/env bash
# Script to run all Smart City Grievance Redressal services locally with SQLite.

set -euo pipefail

# Print banner
echo "=========================================================="
echo " Starting Smart City Grievance Redressal System (Local)   "
echo " Database Profile: SQLite (Local)                         "
echo "=========================================================="

# Track child PIDs to kill them on exit
PIDS=()

port_in_use() {
    local port="$1"
    (echo >/dev/tcp/127.0.0.1/"$port") >/dev/null 2>&1
}

pick_backend_port() {
    local preferred="${1:-8080}"
    local fallback="${2:-8081}"

    if port_in_use "$preferred"; then
        echo "$fallback"
    else
        echo "$preferred"
    fi
}

cleanup() {
    echo ""
    echo "Stopping all services..."
    for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid"
        fi
    done
    echo "Shutdown complete."
}

# Handle exit/interrupt signals
trap cleanup EXIT INT TERM

# 1. Start ML Service (Flask)
echo "Starting ML Service..."
cd ml-service

# Setup/Activate Python virtual environment
if [ -d ".venv" ]; then
    echo "Activating Python virtual environment..."
    source .venv/bin/activate
    if ! python -c "import flask" 2>/dev/null; then
        echo "Flask not found in .venv. Installing dependencies from requirements.txt..."
        pip install -r requirements.txt
    fi
else
    echo "Python virtual environment (.venv) not found. Creating one..."
    python3 -m venv .venv
    source .venv/bin/activate
    echo "Installing dependencies from requirements.txt..."
    pip install -r requirements.txt
fi

# Set ML Environment Variables
export AUTO_TRAIN=1
export MODEL_PATH="$(pwd)/artifacts/model.pkl"
export PRIORITY_MODEL_PATH="$(pwd)/artifacts/priority_model.pkl"
export SHAP_BACKGROUND_PATH="$(pwd)/artifacts/shap_background.json"
export METRICS_PATH="$(pwd)/artifacts/metrics.json"
export TRAIN_ARGS="--bert --bert-model-name all-MiniLM-L6-v2 --sample-rows 25000"
export HF_HUB_OFFLINE=1
export TRANSFORMERS_OFFLINE=1

# Start flask application on port 5000
python app.py &
ML_PID=$!
PIDS+=("$ML_PID")
echo "ML Service started (PID: $ML_PID, port: 5000)"

# Go back to root
cd ..

# 2. Start Spring Boot Backend (Active Profile: SQLite)
echo "Starting Spring Boot Backend (SQLite)..."
cd backend
export SPRING_PROFILES_ACTIVE=sqlite
BACKEND_PORT="$(pick_backend_port 8080 8081)"
# Start Spring Boot application on an available port
mvn spring-boot:run -Dspring-boot.run.arguments="--server.port=${BACKEND_PORT}" &
BACKEND_PID=$!
PIDS+=("$BACKEND_PID")
echo "Backend started (PID: $BACKEND_PID, port: ${BACKEND_PORT})"

# Go back to root
cd ..

# 3. Start React Frontend (Vite)
echo "Starting React Frontend..."
cd frontend
export VITE_API_URL="http://localhost:${BACKEND_PORT}/api"
# Start Vite development server on port 5173
npm run dev &
FRONTEND_PID=$!
PIDS+=("$FRONTEND_PID")
echo "Frontend started (PID: $FRONTEND_PID, port: 5173)"

# Go back to root
cd ..

echo "All services launched. Press Ctrl+C to stop them."
wait
