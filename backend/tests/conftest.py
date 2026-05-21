import pytest
from typing import Generator
from fastapi.testclient import TestClient

from simulator.main import SpectrometerSimulator
from app.main import app


@pytest.fixture
def simulator() -> SpectrometerSimulator:
    return SpectrometerSimulator()


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as test_client:
        yield test_client
