# Verification And Validation Evidence

This project has explicit verification and validation evidence across backend, ML, and UI layers.

## Backend Verification
- [`backend/src/test/java/com/example/backend/ComplaintVisibilityTests.java`](/home/srikanth-r/Desktop/IDP/backend/src/test/java/com/example/backend/ComplaintVisibilityTests.java)
- Verifies that admins can see all complaints
- Verifies that ward members only see complaints from their own ward

## ML Validation
- [`ml-service/train_smoke.py`](/home/srikanth-r/Desktop/IDP/ml-service/train_smoke.py)
- [`ml-service/predict_smoke.py`](/home/srikanth-r/Desktop/IDP/ml-service/predict_smoke.py)
- [`ml-service/shap_smoke.py`](/home/srikanth-r/Desktop/IDP/ml-service/shap_smoke.py)
- [`ml-service/artifacts/metrics.json`](/home/srikanth-r/Desktop/IDP/ml-service/artifacts/metrics.json)
- [`ml-service/artifacts/per_class_report.csv`](/home/srikanth-r/Desktop/IDP/ml-service/artifacts/per_class_report.csv)
- [`ml-service/artifacts/confusion_matrix.png`](/home/srikanth-r/Desktop/IDP/ml-service/artifacts/confusion_matrix.png)
- [`ml-service/artifacts/priority_per_class_report.csv`](/home/srikanth-r/Desktop/IDP/ml-service/artifacts/priority_per_class_report.csv)
- [`ml-service/artifacts/priority_confusion_matrix.png`](/home/srikanth-r/Desktop/IDP/ml-service/artifacts/priority_confusion_matrix.png)
- ROC/AUC data is also serialized inside [`ml-service/artifacts/metrics.json`](/home/srikanth-r/Desktop/IDP/ml-service/artifacts/metrics.json)
- The ROC curve image is saved as [`ml-service/artifacts/roc_curve.png`](/home/srikanth-r/Desktop/IDP/ml-service/artifacts/roc_curve.png)

## Runtime Checks
- [`ml-service/app.py`](/home/srikanth-r/Desktop/IDP/ml-service/app.py)
- `GET /health` confirms the model service is alive
- `GET /metrics` exposes the saved evaluation results
- `POST /predict` validates live inference and SHAP explanation generation

## Report-Ready Screenshots
- [`frontend/src/pages/MLDashboard.tsx`](/home/srikanth-r/Desktop/IDP/frontend/src/pages/MLDashboard.tsx)
- [`frontend/src/pages/AdminDashboard.tsx`](/home/srikanth-r/Desktop/IDP/frontend/src/pages/AdminDashboard.tsx)
- The ML dashboard now shows a ROC curve and AUC summary alongside the confusion matrix and per-class reports.

## Suggested Report Wording
- `The project was validated using backend integration tests, ML smoke tests, a held-out evaluation split, and runtime health/metrics endpoints.`
- `Verification evidence is surfaced in the ML dashboard through health checks, accuracy metrics, confusion matrices, and live prediction sandbox results.`
