import asyncio
from types import SimpleNamespace
from typing import cast
from unittest.mock import AsyncMock

import pytest
from fastapi import WebSocket
from fastapi import WebSocketDisconnect

from app.main import spectrum


@pytest.mark.asyncio
async def test_spectrum_ignores_websocket_disconnect_and_unsubscribes() -> None:
    payload = {"timestamp": "2024-01-01T00:00:00", "index": 0, "spectrum": [1.0]}
    queue: asyncio.Queue[dict[str, object]] = asyncio.Queue()
    queue.put_nowait(payload)

    simulator = SimpleNamespace(
        subscribe=AsyncMock(return_value=queue),
        unsubscribe=AsyncMock(),
    )
    websocket = SimpleNamespace(
        app=SimpleNamespace(state=SimpleNamespace(simulator=simulator)),
        accept=AsyncMock(),
        send_json=AsyncMock(side_effect=WebSocketDisconnect(code=1000)),
    )

    await spectrum(cast(WebSocket, websocket))

    websocket.accept.assert_awaited_once()
    simulator.subscribe.assert_awaited_once_with()
    websocket.send_json.assert_awaited_once_with(payload)
    simulator.unsubscribe.assert_awaited_once_with(queue)
