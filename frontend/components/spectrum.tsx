"use client";

import { CartesianGrid, Line, LineChart, XAxis } from "recharts";
import { start, stop, setIndex } from "@/api/actions";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

import useWebSocket, { ReadyState } from "react-use-websocket";
import {
  startTransition,
  use,
  useActionState,
  useEffect,
  useState,
} from "react";
import { Slider } from "./ui/slider";
import { Badge, GreenBadge, RedBadge, YellowBadge } from "./ui/badge";
import { Toggle } from "./ui/toggle";
import { Link, Play, Square } from "lucide-react";

export type ConnectionStatus =
  | "Connecting"
  | "Open"
  | "Closing"
  | "Closed"
  | "Uninstantiated";

const connectionStatusMap: Record<ReadyState, ConnectionStatus> = {
  [ReadyState.CONNECTING]: "Connecting",
  [ReadyState.OPEN]: "Open",
  [ReadyState.CLOSING]: "Closing",
  [ReadyState.CLOSED]: "Closed",
  [ReadyState.UNINSTANTIATED]: "Uninstantiated",
};

const WEBSOCKET_BASE_URL = process.env.NEXT_PUBLIC_WS_BASE_URL;

const chartConfig = {
  absorbance: {
    label: "Absorbance",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function Spectrum({ timestamps }: { timestamps: Promise<string[]> }) {
  const [shouldConnect, setShouldConnect] = useState(false);
  const [chartData, setChartData] = useState<
    { wavenumber: number; absorbance: number }[]
  >([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isAdjustingIndex, setIsAdjustingIndex] = useState(false);
  const [pendingSelectedIndex, setPendingSelectedIndex] = useState<
    number | null
  >(null);
  const [isUpdatingIndex, setIsUpdatingIndex] = useState(false);
  const [controlState, setControlState] = useState<"start" | "stop">("stop");

  const allTimestamps = use(timestamps);
  const [_, dispatchStart, isPendingStart] = useActionState(start, null);
  const [__, dispatchStop, isPendingStop] = useActionState(stop, null);

  const { lastJsonMessage, readyState } = useWebSocket<{
    timestamp: string;
    spectrum: number[];
  }>(
    `${WEBSOCKET_BASE_URL}/ws/spectrum`,
    {
      shouldReconnect: () => true,
      reconnectAttempts: 10,
      reconnectInterval: 3000,
    },
    shouldConnect,
  );

  const connectionStatus = connectionStatusMap[readyState];
  const isConnectionOpen = connectionStatus === "Open";
  const isRunning = controlState === "start" || isPendingStart;

  useEffect(() => {
    if (!lastJsonMessage) {
      return;
    }

    const nextTimestamp = lastJsonMessage.timestamp;
    const nextSpectrum = lastJsonMessage.spectrum;
    const nextIndex = allTimestamps.indexOf(nextTimestamp);

    setChartData(
      nextSpectrum.map((absorbance, index) => ({
        wavenumber: index + 1000,
        absorbance,
      })),
    );

    if (isAdjustingIndex) {
      return;
    }

    if (pendingSelectedIndex !== null && nextIndex !== pendingSelectedIndex) {
      return;
    }

    if (nextIndex >= 0) {
      setSelectedIndex(nextIndex);
      if (pendingSelectedIndex === nextIndex) {
        setPendingSelectedIndex(null);
      }
    }
  }, [allTimestamps, isAdjustingIndex, lastJsonMessage, pendingSelectedIndex]);

  const handleIndexCommit = async (value: number[]) => {
    const nextIndex = value[0] ?? 0;

    setIsAdjustingIndex(false);
    setSelectedIndex(nextIndex);
    setPendingSelectedIndex(nextIndex);
    setIsUpdatingIndex(true);

    try {
      await setIndex(nextIndex);
    } catch (error) {
      console.error("Failed to set index:", error);
      setPendingSelectedIndex(null);
    } finally {
      setIsUpdatingIndex(false);
    }
  };

  const isDisconnectDisabled = shouldConnect && isRunning;
  const isStartDisabled =
    !isConnectionOpen || controlState === "start" || isPendingStart;
  const isStopDisabled =
    !isConnectionOpen || controlState === "stop" || isPendingStop;
  const isSliderDisabled = isRunning || isUpdatingIndex || !isConnectionOpen;

  return (
    <div className="w-full max-w-4xl">
      <ChartContainer config={chartConfig}>
        <LineChart
          accessibilityLayer
          data={chartData}
          margin={{
            left: 12,
            right: 12,
          }}
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="wavenumber"
            tickLine={true}
            axisLine={true}
            tickMargin={8}
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent hideLabel />}
          />
          <Line
            dataKey="absorbance"
            type="natural"
            stroke="var(--chart-1)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ChartContainer>
      <Slider
        className="py-8"
        min={0}
        max={allTimestamps.length - 1}
        step={1}
        value={[selectedIndex]}
        onValueChange={(value) => {
          setIsAdjustingIndex(true);
          setSelectedIndex(value[0] ?? 0);
        }}
        onValueCommit={handleIndexCommit}
        disabled={isSliderDisabled}
      />

      <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm">
          <p className="text-muted-foreground">Connection Status:</p>
          {connectionStatus === "Open" ? (
            <GreenBadge label="Open" />
          ) : connectionStatus === "Closed" ? (
            <RedBadge label="Closed" />
          ) : connectionStatus === "Uninstantiated" ? (
            <Badge variant="outline">Uninstantiated</Badge>
          ) : (
            <YellowBadge label={connectionStatus} />
          )}
          <p>
            Current Timestamp:{" "}
            {new Date(allTimestamps[selectedIndex]).toLocaleString()}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <Toggle
            aria-label="Toggle shouldConnect"
            disabled={isDisconnectDisabled}
            onClick={() => {
              if (isDisconnectDisabled) {
                return;
              }

              setShouldConnect((prev) => !prev);
            }}
          >
            <Link className="group-data-[state=on]/toggle:text-red-500" />
            {shouldConnect ? "Disconnect" : "Connect"}
          </Toggle>
          <ToggleGroup
            variant="outline"
            type="single"
            value={controlState}
            onValueChange={(value) => {
              if (!value || !isConnectionOpen) {
                return;
              }

              if (value === "start") {
                startTransition(dispatchStart);
              } else {
                startTransition(dispatchStop);
              }

              setControlState(value as "start" | "stop");
            }}
          >
            <ToggleGroupItem value="start" disabled={isStartDisabled}>
              <Play />
              Start
            </ToggleGroupItem>
            <ToggleGroupItem value="stop" disabled={isStopDisabled}>
              <Square />
              Stop
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
    </div>
  );
}
