from datetime import timedelta
from typing import cast

from fastapi import FastAPI
from fastapi.testclient import TestClient

from simulator.main import SpectrometerSimulator
from app.main import app


def get_simulator(client: TestClient) -> SpectrometerSimulator:
    app = cast(FastAPI, client.app)
    return cast(SpectrometerSimulator, app.state.simulator)


def test_start_and_stop_simulation_endpoints_toggle_running_state(
    client: TestClient,
) -> None:
    start_response = client.patch("/simulation/start")
    simulator = get_simulator(client)

    assert start_response.status_code == 200
    assert start_response.json() == {"data": {"running": True}}
    assert simulator.running is True

    stop_response = client.patch("/simulation/stop")

    assert stop_response.status_code == 200
    assert stop_response.json() == {"data": {"running": False}}
    assert simulator.running is False


def test_app_lifespan_initializes_simulator_and_shuts_down_cleanly() -> None:
    with TestClient(app) as client:
        simulator = get_simulator(client)

        assert isinstance(simulator, SpectrometerSimulator)


def test_start_when_already_running_returns_400(client: TestClient) -> None:
    simulator = get_simulator(client)
    simulator.running = True

    response = client.patch("/simulation/start")

    assert response.status_code == 400
    assert response.json() == {"detail": "Simulation is already running."}


def test_stop_when_already_stopped_returns_400(client: TestClient) -> None:
    simulator = get_simulator(client)
    simulator.running = False

    response = client.patch("/simulation/stop")

    assert response.status_code == 400
    assert response.json() == {"detail": "Simulation is already stopped."}


def test_get_latest_spectrum_returns_current_simulator_state(
    client: TestClient,
) -> None:
    simulator = get_simulator(client)
    expected = simulator.data[0]

    response = client.get("/simulation/spectrum")

    assert response.status_code == 200
    assert response.json() == {
        "data": {
            "timestamp": expected.timestamp.isoformat(),
            "index": 0,
            "spectrum": expected.spectrum,
        }
    }


def test_get_timestamps_returns_all_available_timestamps(client: TestClient) -> None:
    simulator = get_simulator(client)

    response = client.get("/simulation/timestamps")

    assert response.status_code == 200
    assert response.json() == {
        "data": {"timestamps": [item.timestamp.isoformat() for item in simulator.data]}
    }


def test_set_timestamp_endpoint_updates_current_state(client: TestClient) -> None:
    expected_index = 2
    simulator = get_simulator(client)
    expected = simulator.data[expected_index]

    response = client.patch(
        "/simulation/timestamp",
        json={"timestamp": expected.timestamp.isoformat()},
    )

    assert response.status_code == 200
    assert response.json() == {
        "data": {
            "timestamp": expected.timestamp.isoformat(),
            "index": expected_index,
            "spectrum": expected.spectrum,
        }
    }
    assert simulator.current_index == expected_index
    assert simulator.current_timestamp == expected.timestamp


def test_get_index_returns_current_simulator_index(client: TestClient) -> None:
    expected_index = 3
    simulator = get_simulator(client)
    simulator.current_index = expected_index

    response = client.get("/simulation/index")

    assert response.status_code == 200
    assert response.json() == {"data": {"index": expected_index}}


def test_set_index_endpoint_updates_current_state(client: TestClient) -> None:
    expected_index = 2
    simulator = get_simulator(client)
    expected = simulator.data[expected_index]

    response = client.patch("/simulation/index", json={"index": expected_index})

    assert response.status_code == 200
    assert response.json() == {"data": {"index": expected_index}}
    assert simulator.current_index == expected_index
    assert simulator.current_timestamp == expected.timestamp


def test_set_timestamp_endpoint_rejects_unknown_timestamp(client: TestClient) -> None:
    simulator = get_simulator(client)
    missing_timestamp = simulator.data[-1].timestamp + timedelta(seconds=1)

    response = client.patch(
        "/simulation/timestamp",
        json={"timestamp": missing_timestamp.isoformat()},
    )

    assert response.status_code == 400
    assert response.json() == {
        "detail": f"Timestamp {missing_timestamp} not found in data."
    }


def test_websocket_sends_initial_state_and_index_updates(client: TestClient) -> None:
    expected_index = 3
    simulator = get_simulator(client)
    expected = simulator.data[expected_index]

    with client.websocket_connect("/ws/spectrum") as websocket:
        initial_payload = websocket.receive_json()

        assert initial_payload == {
            "timestamp": simulator.data[0].timestamp.isoformat(),
            "index": 0,
            "spectrum": simulator.data[0].spectrum,
        }

        response = client.patch("/simulation/index", json={"index": expected_index})

        assert response.status_code == 200
        assert websocket.receive_json() == {
            "timestamp": expected.timestamp.isoformat(),
            "index": expected_index,
            "spectrum": expected.spectrum,
        }
