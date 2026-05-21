from contextlib import suppress
from datetime import timedelta

import asyncio
import pytest

from simulator.main import SpectrometerSimulator


@pytest.mark.asyncio
async def test_set_index_updates_latest_state(simulator: SpectrometerSimulator) -> None:
    expected_index = 1
    expected_data = simulator.data[expected_index]

    await simulator.set_index(expected_index)

    timestamp, index, spectrum = await simulator.get_latest_state()

    assert index == expected_index
    assert timestamp == expected_data.timestamp
    assert spectrum == expected_data.spectrum


@pytest.mark.asyncio
async def test_set_timestamp_updates_latest_state(
    simulator: SpectrometerSimulator,
) -> None:
    expected_index = 2
    expected_data = simulator.data[expected_index]

    await simulator.set_timestamp(expected_data.timestamp)

    timestamp, index, spectrum = await simulator.get_latest_state()

    assert index == expected_index
    assert timestamp == expected_data.timestamp
    assert spectrum == expected_data.spectrum


@pytest.mark.asyncio
async def test_set_timestamp_raises_for_unknown_timestamp(
    simulator: SpectrometerSimulator,
) -> None:
    missing_timestamp = simulator.data[-1].timestamp + timedelta(seconds=1)

    with pytest.raises(ValueError, match="not found in data"):
        await simulator.set_timestamp(missing_timestamp)


@pytest.mark.asyncio
async def test_subscribe_returns_current_state_immediately(
    simulator: SpectrometerSimulator,
) -> None:
    queue = await simulator.subscribe()

    payload = await queue.get()

    assert payload == {
        "timestamp": simulator.data[0].timestamp.isoformat(),
        "index": 0,
        "spectrum": simulator.data[0].spectrum,
    }


@pytest.mark.asyncio
async def test_subscribe_receives_broadcast_when_state_changes(
    simulator: SpectrometerSimulator,
) -> None:
    queue = await simulator.subscribe()
    await queue.get()

    expected_index = 3
    expected_data = simulator.data[expected_index]

    await simulator.set_index(expected_index)

    payload = await queue.get()

    assert payload == {
        "timestamp": expected_data.timestamp.isoformat(),
        "index": expected_index,
        "spectrum": expected_data.spectrum,
    }


@pytest.mark.asyncio
async def test_unsubscribe_stops_future_broadcasts(
    simulator: SpectrometerSimulator,
) -> None:
    queue = await simulator.subscribe()
    await queue.get()

    await simulator.unsubscribe(queue)
    await simulator.set_index(1)

    with pytest.raises(asyncio.TimeoutError):
        await asyncio.wait_for(queue.get(), timeout=0.05)


def test_get_sleep_time_returns_delta_to_next_timestamp(
    simulator: SpectrometerSimulator,
) -> None:
    current_index = 1
    current_timestamp = simulator.data[current_index].timestamp
    expected_sleep_time = (
        simulator.data[current_index + 1].timestamp - current_timestamp
    ).total_seconds()

    sleep_time = simulator._get_sleep_time(current_index, current_timestamp)

    assert sleep_time == expected_sleep_time


def test_get_sleep_time_returns_one_second_when_wrapping(
    simulator: SpectrometerSimulator,
) -> None:
    last_index = len(simulator.data) - 1
    current_timestamp = simulator.data[last_index].timestamp

    sleep_time = simulator._get_sleep_time(last_index, current_timestamp)

    assert sleep_time == 1.0


@pytest.mark.asyncio
async def test_start_and_stop_toggle_running_state(
    simulator: SpectrometerSimulator,
) -> None:
    await simulator.start()

    assert simulator.running is True
    assert simulator._running_event.is_set() is True

    await simulator.stop()

    assert simulator.running is False
    assert simulator._running_event.is_set() is False


@pytest.mark.asyncio
async def test_run_waits_for_start_before_broadcasting(
    simulator: SpectrometerSimulator,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    queue = await simulator.subscribe()
    await queue.get()
    monkeypatch.setattr(simulator, "_get_sleep_time", lambda *_: 0.01)
    run_task = asyncio.create_task(simulator.run())

    try:
        with pytest.raises(asyncio.TimeoutError):
            await asyncio.wait_for(queue.get(), timeout=0.02)

        await simulator.start()

        payload = await asyncio.wait_for(queue.get(), timeout=0.05)

        assert payload == {
            "timestamp": simulator.data[0].timestamp.isoformat(),
            "index": 0,
            "spectrum": simulator.data[0].spectrum,
        }
    finally:
        run_task.cancel()
        with suppress(asyncio.CancelledError):
            await run_task


@pytest.mark.asyncio
async def test_run_advances_to_next_index_after_sleep(
    simulator: SpectrometerSimulator,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    queue = await simulator.subscribe()
    await queue.get()
    monkeypatch.setattr(simulator, "_get_sleep_time", lambda *_: 0.01)
    run_task = asyncio.create_task(simulator.run())

    try:
        await simulator.start()

        first_payload = await asyncio.wait_for(queue.get(), timeout=0.05)
        second_payload = await asyncio.wait_for(queue.get(), timeout=0.05)

        assert first_payload["index"] == 0
        assert second_payload == {
            "timestamp": simulator.data[1].timestamp.isoformat(),
            "index": 1,
            "spectrum": simulator.data[1].spectrum,
        }
    finally:
        run_task.cancel()
        with suppress(asyncio.CancelledError):
            await run_task