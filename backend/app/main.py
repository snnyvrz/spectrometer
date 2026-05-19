import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from simulator.main import SpectrometerSimulator
from .routes import router
from .settings import get_settings


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
settings = get_settings()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.websocket("/ws/spectrum")
async def spectrum(websocket: WebSocket):
    await websocket.accept()

    simulator = get_simulator_from_websocket(websocket)
    queue = await simulator.subscribe()

    try:
        while True:
            payload = await queue.get()
            await websocket.send_json(payload)

    except WebSocketDisconnect:
        pass

    finally:
        await simulator.unsubscribe(queue)
