# Smart City Complaints - Demo

This repo contains a demo-ready smart city complaints system with three services:
- Backend: Spring Boot API with JWT auth and file uploads.
- Frontend: React (Vite) dashboard for citizens, admins, and ward members.
- ML Service: Flask classifier using a pre-trained model.

## Demo Accounts
The backend seeds demo accounts on startup (change via environment variables if needed):
- Admin: `admin` / `Admin@123`
- Ward Member (generic): `ward` / `Ward@123`
- Ward Members (1-20): `ward1`-`ward20` / `Ward@1231`-`Ward@12320` (each mapped to ward number 1-20)
- Citizen Users (1-10): `citizen1`-`citizen10` / `Citizen@1231`-`Citizen@12310`
- Workers (1-10): `worker1`-`worker10` / `Worker@1231`-`Worker@12310`
- Department Officers: `dept_roads` (and other `dept_*`) / `Department@123`
- Customer Care: `care` / `Care@123`

Citizen accounts can also be created through the Register screen.

## Seeding Strategy
By default, Java seeders are enabled and SQL seeding is disabled.
- Java seeders: `app.seed.java.enabled=true`
- SQL seed file: `backend/src/main/resources/data.sql`

To switch to SQL seeding (and disable Java seeders), set:
- `spring.sql.init.mode=always`
- `app.seed.java.enabled=false`

If you already seeded data, consider dropping volumes or clearing tables before switching.

## Quick Start (Podman Compose)
From the repo root:

```bash
podman-compose up --build
```

Then open:
- Frontend: http://localhost:5173
- Backend: http://localhost:8080
- ML Health: http://localhost:5000/health

## Verification And Validation
This project already includes explicit verification and validation evidence:
- Backend verification: `backend/src/test/java/com/example/backend/ComplaintVisibilityTests.java`
- ML smoke validation: `ml-service/train_smoke.py`, `ml-service/predict_smoke.py`, `ml-service/shap_smoke.py`
- Runtime ML validation endpoints: `GET /health`, `GET /metrics`, `POST /predict`
- Trained validation artifacts: `ml-service/artifacts/metrics.json`, `ml-service/artifacts/per_class_report.csv`, `ml-service/artifacts/confusion_matrix.png`, `ml-service/artifacts/priority_confusion_matrix.png`
- ROC/AUC validation: stored in `ml-service/artifacts/metrics.json` and `ml-service/artifacts/roc_curve.png`, rendered in the ML dashboard
- Explainability artifact: `ml-service/artifacts/shap_background.json`
- Full summary doc: [docs/verification-validation.md](/home/srikanth-r/Desktop/IDP/docs/verification-validation.md)

For a clean report screenshot, the best runtime page is:
- [frontend/src/pages/MLDashboard.tsx](/home/srikanth-r/Desktop/IDP/frontend/src/pages/MLDashboard.tsx)

For a short report note, you can say:
- `The project was verified through backend JUnit tests, ML smoke tests, health checks, and validation metrics generated from a train-test split.`

## How Priority Is Assigned
Priority is not set manually by the citizen. It is decided during complaint submission in the backend.

Simple flow:
1. The citizen submits the complaint text.
2. The backend sends the text to the ML service.
3. The ML service predicts `category` and `priority`.
4. The backend checks the prediction confidence.
5. If confidence is low, it falls back to rule-based priority logic.
6. If the complaint looks safety-critical, the backend forces `HIGH` priority.

Backend rule in plain language:
- `HIGH` priority is used for urgent or dangerous issues like live wire, sparks, fire, explosion, collapse, or similar hazards.
- `MEDIUM` or `LOW` is used when the issue is less urgent and the model/rules agree.
- If the model is unsure, the backend still assigns a usable priority instead of leaving it blank.

Why this is important:
- urgent complaints are routed faster
- SLA monitoring becomes meaningful
- workers and ward members can focus on high-risk issues first

## How SLA Breaches Work
SLA breach means a complaint stayed open longer than allowed for its priority.

Thresholds used in the project:
- High priority: 24 hours
- Medium priority: 48 hours
- Low priority: 72 hours

What the backend does:
- it checks every open complaint
- it compares `createdAt` with the SLA threshold for that complaint's priority
- if the complaint is still open after the threshold, it is counted as an SLA breach

Why SLA breaches matter:
- they show delayed civic service
- they help measure accountability
- they expose backlog in a simple dashboard number
- they help customer care and admins decide what needs attention first

## Core Project Logic
The project follows this main cycle:
1. Citizen logs in and submits a complaint.
2. Complaint text and optional image are stored.
3. ML classifies the complaint category and priority.
4. Backend saves the complaint and routes it to the correct department or worker.
5. Dashboards show status, history, SLA breaches, and resolution progress.
6. Citizens can track updates and give feedback after resolution.

One-line explanation for viva:
- `This project automates civic complaint intake, ML-based classification, priority assignment, routing, and SLA monitoring with role-based dashboards.`

## Viva Answer
If asked to explain the code logic in viva, say:

`The citizen submits a complaint through the frontend. The backend validates the data and sends the complaint text to the ML service. The ML service predicts the category and priority. If the model is uncertain, the backend uses fallback rules, and if the issue is dangerous, it forces HIGH priority. After that, the complaint is saved in the database, routed to the correct department or worker, and monitored through dashboards for status, history, and SLA breaches.`

## Short Explanation
This project is a smart complaint management system. A citizen enters a complaint, optionally attaches an image, and submits it. The backend classifies the complaint using ML, assigns priority, stores the complaint, and routes it to the right department or worker. The system then tracks progress, resolution time, and SLA breaches so administrators and customer care can monitor delays and act quickly.

## Flowchart Style Logic
1. Citizen writes the complaint.
2. Optional image is uploaded or attached.
3. Backend validates the request.
4. Complaint text is sent to the ML service.
5. ML returns category, priority, and explanation.
6. Backend checks confidence.
7. Low-confidence predictions use fallback rules.
8. Dangerous complaints are forced to HIGH priority.
9. Complaint is saved in the database.
10. Complaint is routed to the right department or worker.
11. Dashboards show complaint status, history, and SLA breaches.
12. Citizen can later track the complaint and submit feedback.

## Key Environment Variables
The compose file already sets these defaults:
- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `ML_SERVICE_URL`
- `DEMO_ADMIN_USERNAME`
- `DEMO_ADMIN_PASSWORD`
- `DEMO_WARD_USERNAME`
- `DEMO_WARD_PASSWORD`
- `VITE_API_URL`
- `MODEL_PATH`

## Local Dev Notes
- Uploads are stored in `backend/uploads` and served from `http://localhost:8080/uploads/...`.
- The ML service loads `model.pkl` from the repo root (or `/app/model.pkl` in containers).
- When running locally (not via compose), the backend defaults to `localhost` for Postgres; in compose it uses the `db` service hostname via `SPRING_DATASOURCE_URL`.

## Minimal API Notes
- `POST /api/auth/login`
- `POST /api/auth/register` (citizen only)
- `POST /api/complaints` (authenticated)
- `GET /api/complaints/my`
- `GET /api/complaints` (admin/ward/department)
- `POST /api/complaints/upload`

# IDP
