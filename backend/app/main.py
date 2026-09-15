import asyncio
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from starlette.types import Message

from simulator.main import SpectrometerSimulator
from .routes import router
from .schemas import ApiResponse, HealthPayload
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
        await task


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


@app.get("/health", response_model=ApiResponse[HealthPayload])
async def health() -> dict[str, dict[str, str]]:
    return {"data": {"status": "ok"}}


@app.websocket("/ws/spectrum")
async def spectrum(websocket: WebSocket):
    await websocket.accept()

    simulator = get_simulator_from_websocket(websocket)
    queue = await simulator.subscribe()
    receive_task: asyncio.Task[Message] | None = None
    queue_task: asyncio.Task[object] | None = None

    try:
        receive_task = asyncio.create_task(websocket.receive())
        while True:
            queue_task = asyncio.create_task(queue.get())
            done, _ = await asyncio.wait(
                {queue_task, receive_task},
                return_when=asyncio.FIRST_COMPLETED,
            )

            if receive_task in done:
                message = receive_task.result()
                if message["type"] == "websocket.disconnect":
                    raise WebSocketDisconnect(code=message.get("code", 1000))
                receive_task = asyncio.create_task(websocket.receive())

            if queue_task in done:
                await websocket.send_json(queue_task.result())
            else:
                queue_task.cancel()
                with suppress(asyncio.CancelledError):
                    await queue_task
            queue_task = None

    except WebSocketDisconnect:
        pass

    finally:
        if receive_task is not None:
            receive_task.cancel()
            with suppress(asyncio.CancelledError, WebSocketDisconnect):
                await receive_task
        if queue_task is not None:
            queue_task.cancel()
            with suppress(asyncio.CancelledError):
                await queue_task
        await simulator.unsubscribe(queue)
