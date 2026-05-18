from typing import Annotated

from fastapi import APIRouter, Depends, Request

from simulator.main import SpectrometerSimulator
from .schemas import (
    ApiError,
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


@router.post("/start/", response_model=ApiResponse[SimulationState])
async def start_simulation(simulator: SimulatorDep):
    simulator.start()
    return {"data": {"running": True}}


@router.post("/stop/", response_model=ApiResponse[SimulationState])
async def stop_simulation(simulator: SimulatorDep):
    simulator.stop()
    return {"data": {"running": False}}


@router.get("/spectrum/", response_model=ApiResponse[SpectrumPayload])
def get_latest_spectrum(simulator: SimulatorDep):
    spectrum = simulator.get_latest_spectrum()
    timestamp = simulator.get_latest_timestamp()
    index = simulator.get_index()
    return {"data": {"timestamp": timestamp, "index": index, "spectrum": spectrum}}


@router.get("/timestamps/", response_model=ApiResponse[TimestampListPayload])
def get_timestamps(simulator: SimulatorDep):
    timestamps = simulator.get_timestamps()
    return {"data": {"timestamps": timestamps}}


@router.post("/timestamp/", response_model=ApiResponse[SpectrumPayload])
def set_time(payload: SetTimeRequest, simulator: SimulatorDep):
    try:
        simulator.set_timestamp(payload.timestamp)
    except ValueError as e:
        return {
            "data": None,
            "error": ApiError(code="timestamp_not_found", message=str(e)),
        }
    spectrum = simulator.get_latest_spectrum()
    timestamp = simulator.get_latest_timestamp()
    index = simulator.get_index()
    return {"data": {"timestamp": timestamp, "index": index, "spectrum": spectrum}}


@router.get("/index/", response_model=ApiResponse[IndexPayload])
def get_index(simulator: SimulatorDep):
    index = simulator.get_index()
    return {"data": {"index": index}}


@router.post("/index/", response_model=ApiResponse[IndexPayload])
def set_index(payload: SetIndexRequest, simulator: SimulatorDep):
    try:
        simulator.set_index(payload.index)
    except ValueError as e:
        return {"data": None, "error": ApiError(code="index_not_found", message=str(e))}
    index = simulator.get_index()
    return {"data": {"index": index}}
