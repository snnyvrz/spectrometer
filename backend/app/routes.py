from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request

from simulator.main import SpectrometerSimulator
from .schemas import (
    ApiResponse,
    IndexPayload,
    SetIndexRequest,
    SetTimeRequest,
    SimulationState,
    SpectrumPayload,
    TimestampListPayload,
)

router = APIRouter(prefix="/simulation")


def get_simulator_from_request(request: Request) -> SpectrometerSimulator:
    return request.app.state.simulator


type SimulatorDep = Annotated[
    SpectrometerSimulator, Depends(get_simulator_from_request)
]


@router.patch("/start", response_model=ApiResponse[SimulationState])
async def start_simulation(simulator: SimulatorDep):
    await simulator.start()
    return {"data": {"running": True}}


@router.patch("/stop", response_model=ApiResponse[SimulationState])
async def stop_simulation(simulator: SimulatorDep):
    await simulator.stop()
    return {"data": {"running": False}}


@router.get("/spectrum", response_model=ApiResponse[SpectrumPayload])
async def get_latest_spectrum(simulator: SimulatorDep):
    timestamp, index, spectrum = await simulator.get_latest_state()
    return {"data": {"timestamp": timestamp, "index": index, "spectrum": spectrum}}


@router.get("/timestamps", response_model=ApiResponse[TimestampListPayload])
def get_timestamps(simulator: SimulatorDep):
    timestamps = simulator.get_timestamps()
    return {"data": {"timestamps": timestamps}}


@router.patch("/timestamp", response_model=ApiResponse[SpectrumPayload])
async def set_time(payload: SetTimeRequest, simulator: SimulatorDep):
    try:
        await simulator.set_timestamp(payload.timestamp)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    timestamp, index, spectrum = await simulator.get_latest_state()
    return {"data": {"timestamp": timestamp, "index": index, "spectrum": spectrum}}


@router.get("/index", response_model=ApiResponse[IndexPayload])
async def get_index(simulator: SimulatorDep):
    index = await simulator.get_index()
    return {"data": {"index": index}}


@router.patch("/index", response_model=ApiResponse[IndexPayload])
async def set_index(payload: SetIndexRequest, simulator: SimulatorDep):
    try:
        await simulator.set_index(payload.index)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    index = await simulator.get_index()
    return {"data": {"index": index}}
