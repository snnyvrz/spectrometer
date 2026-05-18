import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from simulator.main import SpectrometerSimulator
from .routes import router


def get_simulator_from_websocket(websocket: WebSocket) -> SpectrometerSimulator:
    return websocket.app.state.simulator


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.simulator = SpectrometerSimulator()
    task = asyncio.create_task(app.state.simulator.run())
    try:
        yield
    finally:
        task.cancel()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.websocket("/ws/spectrum")
async def spectrum(websocket: WebSocket):
    await websocket.accept()
    simulator = get_simulator_from_websocket(websocket)
    try:
        while True:
            await simulator._update_event.wait()
            timestamp, _, spectrum = await simulator.get_latest_state()
            await websocket.send_json(
                {"timestamp": timestamp.isoformat(), "spectrum": spectrum}
            )
    except asyncio.CancelledError:
        await websocket.close()
