# Smart City Complaints - Demo

This repo contains a demo-ready smart city complaints system with three services:
- Backend: Spring Boot API with JWT auth and file uploads.
- Frontend: React (Vite) dashboard for citizens, admins, and ward members.
- ML Service: Flask classifier using a pre-trained model.

## Demo Accounts
The backend seeds demo accounts on startup (change via environment variables if needed):
- Admin: `admin` / `admin123`
- Ward Member: `ward` / `ward123`

Citizen accounts are created through the Register screen.

## Quick Start (Podman Compose)
From the repo root:

```bash
podman-compose up --build
```

Then open:
- Frontend: http://localhost:5173
- Backend: http://localhost:8080
- ML Health: http://localhost:5000/health

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

## Minimal API Notes
- `POST /api/auth/login`
- `POST /api/auth/register` (citizen only)
- `POST /api/complaints` (authenticated)
- `GET /api/complaints/my`
- `GET /api/complaints` (admin/ward)
- `POST /api/complaints/upload`

# IDP
