# Repository Instructions

## Structure and Runtime

- This is a two-service application: `backend/` is a FastAPI simulator and `frontend/` is a Next.js app; CI validates them independently from their respective directories.
- The backend simulator loads the repository-root `spectra.csv` at startup. Keep that file available when running the backend or building/running Docker images; it is required runtime input.
- The backend API is exposed under `/simulation`; the live spectrum stream is the `/ws/spectrum` WebSocket. `backend/app/main.py` owns app lifespan, simulator state, CORS, and WebSocket setup; `backend/app/routes.py` owns HTTP simulation routes.
- Frontend server-side API requests use `API_BASE_URL`. Browser-facing WebSocket/build configuration uses `NEXT_PUBLIC_WS_BASE_URL` (and `NEXT_PUBLIC_API_BASE_URL` for the public API value); do not substitute the Docker-internal `http://backend:8000` for browser-facing URLs.
- The frontend Docker image uses Next standalone output and receives `NEXT_PUBLIC_*` values at build time; `API_BASE_URL` is a runtime environment value for the container.

## Setup and Commands

- Backend requires Python `3.14` and `uv`. From `backend/`, install with `uv sync --dev`, lint with `uv run ruff check .`, and test with `uv run pytest -q`.
- Backend formatting is enforced by the backend pre-commit config: `uv run ruff format .` formats, and `uv run ruff format --check .` checks formatting.
- Frontend requires Node `22` and pnpm `10`. From `frontend/`, install with `pnpm install --frozen-lockfile`; use `pnpm lint`, `pnpm test`, and `pnpm build` for the CI-equivalent checks.
- Frontend unit tests run in Vitest/jsdom and exclude `e2e/`; target a focused test with `pnpm exec vitest run path/to/file.test.tsx` or a name with `pnpm exec vitest run -t 'test name'`.
- Frontend E2E tests use Playwright Chromium. From `frontend/`, `pnpm test:e2e` starts both the backend and frontend dev servers automatically; backend dependencies must already be installed with `uv sync --dev` and Playwright browsers must be installed if missing.
- Run checks in the same service order as CI when changing both sides: backend `uv run ruff check .` then `uv run pytest -q`; frontend `pnpm lint`, `pnpm test`, then `pnpm build`.

## Environment and Hooks

- For local development, copy `backend/.env.example` to `backend/.env` and `frontend/.env.example` to `frontend/.env`; for Docker, copy the root `.env.example` to `.env`. The defaults use ports 8000 and 3000.
- Root `docker compose up --build` starts the backend first and waits for its `/health` check before starting the frontend. Docker uses `API_BASE_URL=http://backend:8000` for server-to-server calls, while the default public URLs remain `localhost`.
- The root Husky pre-commit hook always runs frontend ESLint, then formats staged frontend files with Prettier and re-stages them. Backend hooks are defined separately in `backend/.pre-commit-config.yaml` for Ruff check and format.
