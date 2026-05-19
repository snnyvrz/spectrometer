# Run Instructions

## Run with Docker

Requires Docker and Docker Compose to be installed.

Create these environment files before running:

- Copy `backend/.env.example` to `backend/.env`
- Copy `frontend/.env.example` to `frontend/.env`

From the repository root:

```bash
docker compose up --build
```

Application URLs:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

## Run locally

Requires `uv` and `pnpm` to be installed.

Create these environment files before running:

- Copy `backend/.env.example` to `backend/.env`
- Copy `frontend/.env.example` to `frontend/.env`

### Backend

From `backend/`:

```bash
uv sync
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Frontend

From `frontend/`:

```bash
pnpm install
pnpm dev
```

Application URLs:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
