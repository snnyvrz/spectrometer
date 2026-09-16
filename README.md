# Spectrometer

A two-service spectrum simulator with a FastAPI backend and a Next.js frontend.

![Example spectrum](example-spectrum.png)

The backend loads `spectra.csv` from the repository root at startup. Keep this file available for local runs and Docker builds.

## What It Demonstrates

Spectrometer is a small real-time data application built around a simulated instrument. It demonstrates:

- A FastAPI backend that loads recorded spectrum frames from CSV.
- A Next.js dashboard that renders the current spectrum with Recharts.
- WebSocket streaming from `/ws/spectrum` for live frame and playback-state updates.
- Start and stop controls for the simulator.
- A timestamp slider for seeking to a specific recorded frame while playback is stopped.
- Reconnection and resynchronization when the WebSocket reconnects or the page is refreshed.
- Server-confirmed state: the backend is authoritative for the current frame and playback status.

The application is intentionally focused on the mechanics of streaming, controlling, and visualizing time-series instrument data. It is not connected to physical spectrometer hardware.

### Current State Scope

Simulation state is currently shared between all clients connected to the same backend process. If one client starts or stops playback, or seeks to another frame, every other client receives that state and sees the same spectrum. State is held in memory, so it resets when the backend process restarts. Separate backend worker processes do not share state with one another.

## Data Format and Units

The root-level `spectra.csv` file is a wide, frame-oriented CSV:

```csv
timestamps,1000,1001,1002,...
2026-04-10T14:16:16.689,0,0,0,...
2026-04-10T14:16:17.117,-1.70E-05,-0.000106571,...
```

- The first column, `timestamps`, contains ISO 8601 timestamps. Each row is one recorded spectrum frame.
- Every remaining column is a wavenumber in `cm⁻¹`. In the bundled data, the columns run from `1000` through `...` in one `cm⁻¹` increments.
- CSV spectrum values are absorbance values in absorbance units (AU). The frontend multiplies them by `1000` for display as milli-absorbance units (mAU).
- The chart x-axis is **Wavenumber (cm⁻¹)** and the y-axis is **Absorbance (mAU)**.

The backend reads the first column by position as the timestamp column and treats every other column as a numeric spectrum sample. New datasets should preserve this shape and use parseable ISO 8601 timestamps.

## Playback Behavior

Playback follows the order of rows in `spectra.csv`:

- Starting playback immediately broadcasts the current frame and then advances through subsequent frames.
- The delay before each next frame is derived from the difference between consecutive row timestamps.
- After the final row, playback wraps to the first row after a one-second delay.
- Stopping playback interrupts any pending delay; a frame that was scheduled before the stop is not applied afterward.
- Seeking also interrupts the pending delay, updates the current frame, and broadcasts the new state immediately.
- The dashboard disables seeking while playback is running and waits for the backend to confirm a seek before clearing the draft slider position.

The HTTP control endpoints are available under `/simulation`:

| Method  | Endpoint                 | Purpose                         |
| ------- | ------------------------ | ------------------------------- |
| `PATCH` | `/simulation/start`      | Start playback                  |
| `PATCH` | `/simulation/stop`       | Stop playback                   |
| `GET`   | `/simulation/spectrum`   | Read the current frame          |
| `GET`   | `/simulation/timestamps` | List available frame timestamps |
| `GET`   | `/simulation/index`      | Read the current frame index    |
| `PATCH` | `/simulation/index`      | Seek to a frame index           |
| `PATCH` | `/simulation/timestamp`  | Seek to a timestamp             |

The live stream is available at `ws://localhost:8000/ws/spectrum` when running locally.

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

Run backend linting, formatting, and tests from `backend/`:

```bash
uv run ruff check .
uv run ruff format --check .
uv run pytest -q
```

Run frontend linting, formatting, tests, and the production build from `frontend/`:

```bash
pnpm lint
pnpm format:check
pnpm test
pnpm build
```

Run frontend end-to-end tests from `frontend/` after installing the Playwright browser. The Playwright configuration starts the backend and frontend development servers automatically:

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

The test suites cover backend API and WebSocket behavior, frontend API/controller behavior, dashboard interactions, and browser-level playback controls.
