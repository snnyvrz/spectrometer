import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useSpectrumController } from "@/components/use-spectrum-controller";

type SocketOptions = {
  onMessage?: (event: MessageEvent<string>) => void;
};

const { startMock, stopMock, setIndexMock, ReadyState, socketState } =
  vi.hoisted(() => ({
    startMock: vi.fn(),
    stopMock: vi.fn(),
    setIndexMock: vi.fn(),
    ReadyState: {
      UNINSTANTIATED: -1,
      CONNECTING: 0,
      OPEN: 1,
      CLOSING: 2,
      CLOSED: 3,
    } as const,
    socketState: {
      lastJsonMessage: null as { spectrum: number[] } | null,
      readyState: 3,
      options: null as SocketOptions | null,
    },
  }));

vi.mock("@/api/actions", () => ({
  start: (...args: unknown[]) => startMock(...args),
  stop: (...args: unknown[]) => stopMock(...args),
  setIndex: (...args: unknown[]) => setIndexMock(...args),
}));

vi.mock("react-use-websocket", () => ({
  __esModule: true,
  default: (_url: string, options: SocketOptions) => {
    socketState.options = options;

    return {
      lastJsonMessage: socketState.lastJsonMessage,
      readyState: socketState.readyState,
    };
  },
  ReadyState,
}));

function createResolvedTimestamps() {
  const value = {
    timestamps: ["2026-05-22T10:00:00Z", "2026-05-22T10:01:00Z"],
    error: null,
  };

  return {
    status: "fulfilled",
    value,
    then: (resolve: (result: typeof value) => void) => resolve(value),
  } as Promise<typeof value> & {
    status: "fulfilled";
    value: typeof value;
  };
}

describe("useSpectrumController", () => {
  beforeEach(() => {
    socketState.lastJsonMessage = null;
    socketState.readyState = ReadyState.CLOSED;
    socketState.options = null;
    startMock.mockReset();
    stopMock.mockReset();
    setIndexMock.mockReset();
  });

  it("derives disabled state while the websocket is closed", () => {
    const { result } = renderHook(() =>
      useSpectrumController({ timestamps: createResolvedTimestamps() }),
    );

    expect(result.current.connectionStatus).toBe("Closed");
    expect(result.current.isConnectionOpen).toBe(false);
    expect(result.current.isStartDisabled).toBe(true);
    expect(result.current.isStopDisabled).toBe(true);
    expect(result.current.isSliderDisabled).toBe(true);
    expect(result.current.timestampsCount).toBe(2);
  });

  it("rolls back control state when start fails", async () => {
    socketState.readyState = ReadyState.OPEN;
    startMock.mockResolvedValue({
      ok: false,
      error: "Failed to start simulation: backend said no",
    });

    const { result } = renderHook(() =>
      useSpectrumController({ timestamps: createResolvedTimestamps() }),
    );

    act(() => {
      result.current.handleControlChange("start");
    });

    await waitFor(() => {
      expect(result.current.controlState).toBe("stop");
      expect(result.current.apiError).toBe(
        "Failed to start simulation: backend said no",
      );
      expect(result.current.isStartDisabled).toBe(false);
      expect(result.current.isStopDisabled).toBe(true);
    });
  });

  it("clears pending slider state after backend confirmation", async () => {
    socketState.readyState = ReadyState.OPEN;
    setIndexMock.mockResolvedValue({ ok: true, error: null });

    const { result } = renderHook(() =>
      useSpectrumController({ timestamps: createResolvedTimestamps() }),
    );

    act(() => {
      result.current.setShouldConnect(true);
      result.current.setDraftIndex(1);
    });

    await act(async () => {
      await result.current.handleIndexCommit([1]);
    });

    expect(setIndexMock).toHaveBeenCalledWith(1);
    expect(result.current.displayedIndex).toBe(1);
    expect(result.current.isSliderDisabled).toBe(true);

    await act(async () => {
      socketState.options?.onMessage?.({
        data: JSON.stringify({ index: 1 }),
      } as MessageEvent<string>);
    });

    await waitFor(() => {
      expect(result.current.displayedIndex).toBe(1);
      expect(result.current.isSliderDisabled).toBe(false);
      expect(result.current.currentTimestamp).toBe("2026-05-22T10:01:00Z");
    });
  });
});
