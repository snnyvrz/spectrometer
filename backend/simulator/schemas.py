from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class SpectrumData:
    timestamp: datetime
    spectrum: list[float]
