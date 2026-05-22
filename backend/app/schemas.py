from datetime import datetime
from pydantic import BaseModel
from typing import Generic, TypeVar

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    data: T | None


class SimulationState(BaseModel):
    running: bool


class HealthPayload(BaseModel):
    status: str


class SpectrumPayload(BaseModel):
    timestamp: datetime
    index: int
    spectrum: list[float]


class TimestampListPayload(BaseModel):
    timestamps: list[datetime]


class IndexPayload(BaseModel):
    index: int


class SetIndexRequest(BaseModel):
    index: int


class SetTimeRequest(BaseModel):
    timestamp: datetime
