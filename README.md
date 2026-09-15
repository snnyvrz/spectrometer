# Spectrometer

A two-service spectrum simulator with a FastAPI backend and a Next.js frontend.

The backend loads `spectra.csv` from the repository root at startup. Keep this file available for local runs and Docker builds.

## Prerequisites

- Docker and Docker Compose for the containerized setup
- Python `3.14` and `uv` for backend development
- Node.js `22` and pnpm `10` for frontend development
- Playwright Chromium for frontend end-to-end tests

## Run with Docker

Requires Docker and Docker Compose to be installed.

Create this environment file before running if you want to override the defaults:

- Copy `.env.example` to `.env`

From the repository root:

```bash
docker compose up --build
```

Application URLs:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- Backend health check: http://localhost:8000/health
- Spectrum WebSocket: ws://localhost:8000/ws/spectrum

The frontend receives browser-facing `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_WS_BASE_URL` values at image build time. `API_BASE_URL` is used by the frontend server for internal requests and defaults to `http://backend:8000` in Docker. Do not use that Docker-internal URL for browser-facing variables.

## Run locally

Create these environment files before running:

- Copy `backend/.env.example` to `backend/.env`
- Copy `frontend/.env.example` to `frontend/.env`

### Backend

From `backend/`:

```bash
uv sync --dev
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Frontend

From `frontend/`:

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Application URLs:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

## Checks

Run backend checks from `backend/`:

```bash
uv run ruff check .
uv run pytest -q
```

Run frontend checks from `frontend/`:

```bash
pnpm lint
pnpm test
pnpm build
```

Run end-to-end tests from `frontend/` after installing the Playwright browser:

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```
