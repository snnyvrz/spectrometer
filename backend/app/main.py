import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from simulator.main import SpectrometerSimulator
from .schemas import SetTimeRequest


simulator = SpectrometerSimulator()


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(simulator.run())
    yield
    task.cancel()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/simulation/start")
async def start_simulation():
    simulator.start()
    return {"running": True}


@app.post("/simulation/stop")
async def stop_simulation():
    simulator.stop()
    return {"running": False}


@app.get("/simulation/spectrum")
def get_latest_spectrum():
    return simulator.get_latest_spectrum()


@app.post("/simulation/time")
def set_time(payload: SetTimeRequest):
    simulator.set_timestamp(payload.timestamp)
    return simulator.get_latest_spectrum()
