import pytest

from simulator.main import SpectrometerSimulator


@pytest.fixture
def simulator() -> SpectrometerSimulator:
    return SpectrometerSimulator()
