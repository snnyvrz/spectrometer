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