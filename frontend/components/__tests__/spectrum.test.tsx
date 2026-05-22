import { Suspense } from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Spectrum } from "@/components/spectrum";

type SocketOptions = {
  onMessage?: (event: MessageEvent<string>) => void;
};

const {
  startMock,
  stopMock,
  setIndexMock,
  refreshMock,
  ReadyState,
  socketState,
} = vi.hoisted(() => ({
  startMock: vi.fn(),
  stopMock: vi.fn(),
  setIndexMock: vi.fn(),
  refreshMock: vi.fn(),
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

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
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

vi.mock("recharts", async () => {
  const React = await import("react");

  const createStub = (name: string) => {
    const Stub = ({ children }: { children?: React.ReactNode }) => (
      <div data-testid={name}>{children}</div>
    );

    Stub.displayName = name;

    return Stub;
  };

  return {
    CartesianGrid: createStub("cartesian-grid"),
    Line: createStub("line"),
    LineChart: createStub("line-chart"),
    XAxis: createStub("x-axis"),
    YAxis: createStub("y-axis"),
  };
});

vi.mock("@/components/ui/chart", async () => {
  const React = await import("react");

  return {
    ChartContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="chart-container">{children}</div>
    ),
    ChartTooltip: () => null,
    ChartTooltipContent: () => null,
  };
});

vi.mock("@/components/ui/slider", () => ({
  Slider: ({
    value,
    disabled,
    min,
    max,
    onValueChange,
    onValueCommit,
  }: {
    value: number[];
    disabled?: boolean;
    min: number;
    max: number;
    onValueChange?: (value: number[]) => void;
    onValueCommit?: (value: number[]) => void;
  }) => (
    <input
      aria-label="Spectrum index"
      type="range"
      min={min}
      max={max}
      disabled={disabled}
      value={value[0] ?? 0}
      onChange={(event) => {
        onValueChange?.([Number(event.currentTarget.value)]);
      }}
      onMouseUp={(event) => {
        onValueCommit?.([Number(event.currentTarget.value)]);
      }}
    />
  ),
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

function renderSpectrum() {
  return render(
    <Suspense fallback={<div>Loading...</div>}>
      <Spectrum timestamps={createResolvedTimestamps()} />
    </Suspense>,
  );
}

function hasTextContent(text: string) {
  return (_content: string, element: Element | null) =>
    element?.tagName === "P" && (element.textContent?.includes(text) ?? false);
}

describe("Spectrum", () => {
  beforeEach(() => {
    socketState.lastJsonMessage = null;
    socketState.readyState = ReadyState.CLOSED;
    socketState.options = null;
    startMock.mockReset();
    stopMock.mockReset();
    setIndexMock.mockReset();
    refreshMock.mockReset();
  });

  it("keeps controls disabled until the websocket is open", async () => {
    const user = userEvent.setup();
    const view = renderSpectrum();

    expect(await screen.findByText("Connection Status:")).toBeInTheDocument();

    const connectButton = screen.getByRole("button", {
      name: /toggle shouldconnect/i,
    });
    const startButton = screen.getByRole("radio", { name: /start/i });
    const slider = screen.getByLabelText("Spectrum index");

    expect(startButton).toBeDisabled();
    expect(slider).toBeDisabled();

    await user.click(connectButton);

    expect(screen.getByText("Disconnect")).toBeInTheDocument();

    socketState.readyState = ReadyState.OPEN;
    view.rerender(
      <Suspense fallback={<div>Loading...</div>}>
        <Spectrum timestamps={createResolvedTimestamps()} />
      </Suspense>,
    );

    await waitFor(() => {
      expect(screen.getByText("Open")).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: /start/i })).toBeEnabled();
      expect(screen.getByLabelText("Spectrum index")).toBeEnabled();
    });
  });

  it("shows an action error and rolls back when starting fails", async () => {
    const user = userEvent.setup();
    socketState.readyState = ReadyState.OPEN;
    startMock.mockResolvedValue({
      ok: false,
      error: "Failed to start simulation: backend said no",
    });

    renderSpectrum();

    expect(await screen.findByText("Open")).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: /start/i }));

    expect(
      await screen.findByText("Failed to start simulation: backend said no"),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole("radio", { name: /start/i })).toBeEnabled();
      expect(screen.getByRole("radio", { name: /stop/i })).toBeDisabled();
    });
  });

  it("updates the selected timestamp after the backend confirms a slider change", async () => {
    socketState.readyState = ReadyState.OPEN;
    setIndexMock.mockResolvedValue({ ok: true, error: null });

    renderSpectrum();

    expect(await screen.findByText("Open")).toBeInTheDocument();

    const slider = screen.getByLabelText("Spectrum index");
    const nextTimestamp = new Date("2026-05-22T10:01:00Z").toLocaleString();

    fireEvent.change(slider, { target: { value: "1" } });
    expect(screen.getByText(hasTextContent(nextTimestamp))).toBeInTheDocument();

    fireEvent.mouseUp(slider, { target: { value: "1" } });

    await waitFor(() => {
      expect(setIndexMock).toHaveBeenCalledWith(1);
      expect(slider).toBeDisabled();
    });

    await act(async () => {
      socketState.options?.onMessage?.({
        data: JSON.stringify({ index: 1 }),
      } as MessageEvent<string>);
    });

    await waitFor(() => {
      expect(slider).toBeEnabled();
      expect(
        screen.getByText(hasTextContent(nextTimestamp)),
      ).toBeInTheDocument();
    });
  });
});
