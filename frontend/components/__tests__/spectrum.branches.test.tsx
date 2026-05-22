import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Spectrum } from "@/components/spectrum";

const refreshMock = vi.fn();
const controllerState = vi.hoisted(() => ({
  apiError: null as string | null,
  chartData: [] as Array<{ wavenumber: number; absorbance: number }>,
  connectionStatus: "Closed" as const,
  controlState: "stop" as "start" | "stop",
  currentTimestamp: null as string | null,
  displayedIndex: 0,
  handleControlChange: vi.fn(),
  handleIndexCommit: vi.fn(),
  isConnectionOpen: false,
  isDisconnectDisabled: false,
  isSliderDisabled: false,
  isStartDisabled: false,
  isStopDisabled: true,
  setActionError: vi.fn(),
  setDraftIndex: vi.fn(),
  setShouldConnect: vi.fn(),
  shouldConnect: false,
  timestampsCount: 2,
}));

vi.mock("@/hooks/use-spectrum-controller", () => ({
  useSpectrumController: () => controllerState,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: refreshMock,
  }),
}));

vi.mock("recharts", async () => {
  await import("react");

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
  await import("react");

  return {
    ChartContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="chart-container">{children}</div>
    ),
    ChartTooltip: () => null,
    ChartTooltipContent: () => null,
  };
});

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => (
    <span>{children}</span>
  ),
}));

vi.mock("@/components/ui/slider", () => ({
  Slider: ({
    onValueChange,
  }: {
    onValueChange?: (value: number[]) => void;
  }) => (
    <button type="button" onClick={() => onValueChange?.([])}>
      Move slider
    </button>
  ),
}));

const toggleGroupHandlers = vi.hoisted(() => ({
  onValueChange: null as ((value: string) => void) | null,
}));

const toggleHandlers = vi.hoisted(() => ({
  onClick: null as (() => void) | null,
}));

vi.mock("@/components/ui/toggle-group", () => ({
  ToggleGroup: ({
    children,
    onValueChange,
  }: {
    children: React.ReactNode;
    onValueChange?: (value: string) => void;
  }) => {
    toggleGroupHandlers.onValueChange = onValueChange ?? null;
    return <div>{children}</div>;
  },
  ToggleGroupItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => (
    <button
      type="button"
      onClick={() => toggleGroupHandlers.onValueChange?.(value)}
    >
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/toggle", () => ({
  Toggle: ({
    children,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    "aria-label"?: string;
  }) => {
    toggleHandlers.onClick = onClick ?? null;

    return (
      <button type="button" onClick={onClick} {...props}>
        {children}
      </button>
    );
  },
}));

describe("Spectrum uncovered branches", () => {
  beforeEach(() => {
    refreshMock.mockReset();
    controllerState.apiError = null;
    controllerState.chartData = [];
    controllerState.connectionStatus = "Closed";
    controllerState.controlState = "stop";
    controllerState.currentTimestamp = null;
    controllerState.displayedIndex = 0;
    controllerState.handleControlChange.mockReset();
    controllerState.handleIndexCommit.mockReset();
    controllerState.isConnectionOpen = false;
    controllerState.isDisconnectDisabled = false;
    controllerState.isSliderDisabled = false;
    controllerState.isStartDisabled = false;
    controllerState.isStopDisabled = true;
    controllerState.setActionError.mockReset();
    controllerState.setDraftIndex.mockReset();
    controllerState.setShouldConnect.mockReset();
    controllerState.shouldConnect = false;
    controllerState.timestampsCount = 2;
    toggleGroupHandlers.onValueChange = null;
    toggleHandlers.onClick = null;
  });

  it("retries by clearing the error and refreshing the route", async () => {
    const user = userEvent.setup();
    controllerState.apiError = "backend said no";

    render(
      <Spectrum
        timestamps={Promise.resolve({ timestamps: [], error: null })}
      />,
    );

    await user.click(screen.getByRole("button", { name: /retry/i }));

    expect(controllerState.setActionError).toHaveBeenCalledWith(null);
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to index zero when the slider emits an empty value", async () => {
    const user = userEvent.setup();

    render(
      <Spectrum
        timestamps={Promise.resolve({ timestamps: [], error: null })}
      />,
    );

    await user.click(screen.getByRole("button", { name: /move slider/i }));

    expect(controllerState.setDraftIndex).toHaveBeenCalledWith(0);
  });

  it("shows an unavailable timestamp and guards disconnect and control changes", async () => {
    const user = userEvent.setup();
    controllerState.shouldConnect = true;
    controllerState.isDisconnectDisabled = true;
    controllerState.isConnectionOpen = false;

    render(
      <Spectrum
        timestamps={Promise.resolve({ timestamps: [], error: null })}
      />,
    );

    expect(screen.getByText(/current timestamp:/i)).toHaveTextContent(
      "Unavailable",
    );

    toggleHandlers.onClick?.();
    await user.click(screen.getByRole("button", { name: /start/i }));

    expect(controllerState.setShouldConnect).not.toHaveBeenCalled();
    expect(controllerState.handleControlChange).not.toHaveBeenCalled();
  });
});
