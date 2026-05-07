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
