"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { start, stop, setIndex } from "@/api/actions";
import type { TimestampsResult } from "@/api/fetch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

import useWebSocket, { ReadyState } from "react-use-websocket";
import { use, useEffect, useRef, useState, useTransition } from "react";
import { Slider } from "./ui/slider";
import { Badge } from "./ui/badge";
import { Toggle } from "./ui/toggle";
import { AlertCircle, Link, Play, RotateCcw, Square } from "lucide-react";
import { useRouter } from "next/navigation";

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

export function Spectrum({
  timestamps,
}: {
  timestamps: Promise<TimestampsResult>;
}) {
  const router = useRouter();
  const [shouldConnect, setShouldConnect] = useState(false);
  const [confirmedIndex, setConfirmedIndex] = useState(0);
  const [draftIndex, setDraftIndex] = useState<number | null>(null);
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const [controlState, setControlState] = useState<"start" | "stop">("stop");
  const { timestamps: allTimestamps, error: initialError } = use(timestamps);
  const [apiError, setApiError] = useState<string | null>(initialError);
  const [isPendingStart, startControlTransition] = useTransition();
  const [isPendingStop, stopControlTransition] = useTransition();

  const hasTimestamps = allTimestamps.length > 0;
  const pendingIndexRef = useRef(pendingIndex);

  useEffect(() => {
    pendingIndexRef.current = pendingIndex;
  }, [pendingIndex]);

  const { lastJsonMessage, readyState } = useWebSocket<{
    timestamp: string;
    index: number;
    spectrum: number[];
  }>(
    `${WEBSOCKET_BASE_URL}/ws/spectrum`,
    {
      onMessage: (event) => {
        try {
          const parsedMessage = JSON.parse(event.data as string) as {
            index?: number;
          };

          if (typeof parsedMessage.index === "number") {
            setConfirmedIndex(parsedMessage.index);

            if (pendingIndexRef.current === parsedMessage.index) {
              setPendingIndex(null);
              setDraftIndex(null);
            }
          }
        } catch {
          return;
        }
      },
      shouldReconnect: () => true,
      reconnectAttempts: 10,
      reconnectInterval: 3000,
    },
    shouldConnect,
  );

  const connectionStatus = connectionStatusMap[readyState];
  const isConnectionOpen = connectionStatus === "Open";
  const isRunning = controlState === "start" || isPendingStart;
  const displayedIndex = draftIndex ?? confirmedIndex;
  const chartData = (lastJsonMessage?.spectrum ?? []).map(
    (absorbance, index) => ({
      wavenumber: index + 1000,
      absorbance: absorbance * 1000,
    }),
  );

  const handleIndexCommit = async (value: number[]) => {
    if (!hasTimestamps) {
      setDraftIndex(null);
      return;
    }

    const nextIndex = value[0] ?? 0;

    setDraftIndex(nextIndex);
    setPendingIndex(nextIndex);

    const result = await setIndex(nextIndex);

    if (!result.ok) {
      setApiError(result.error);
      setPendingIndex(null);
      setDraftIndex(null);
    } else {
      setApiError(null);
    }
  };

  const handleControlChange = (value: string) => {
    if (!isConnectionOpen) {
      return;
    }

    setControlState(value as "start" | "stop");

    if (value === "start") {
      startControlTransition(async () => {
        const result = await start();

        if (!result.ok) {
          setApiError(result.error);
          setControlState("stop");
          return;
        }

        setApiError(null);
      });

      return;
    }

    stopControlTransition(async () => {
      const result = await stop();

      if (!result.ok) {
        setApiError(result.error);
        setControlState("start");
        return;
      }

      setApiError(null);
    });
  };

  const isDisconnectDisabled = shouldConnect && isRunning;
  const isStartDisabled =
    !isConnectionOpen || controlState === "start" || isPendingStart;
  const isStopDisabled =
    !isConnectionOpen || controlState === "stop" || isPendingStop;
  const isSliderDisabled =
    isRunning || pendingIndex !== null || !isConnectionOpen || !hasTimestamps;
  const currentTimestamp = hasTimestamps ? allTimestamps[displayedIndex] : null;

  return (
    <div className="w-full max-w-4xl border rounded-lg border-primary bg-card p-6">
      {apiError ? (
        <div className="mb-4 flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <p>{apiError}</p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 self-start rounded-md border border-current px-3 py-2 font-medium transition-opacity hover:opacity-80"
            onClick={() => router.refresh()}
          >
            <RotateCcw className="size-4" />
            Retry
          </button>
        </div>
      ) : null}

      <ChartContainer config={chartConfig}>
        <LineChart
          accessibilityLayer
          data={chartData}
          margin={{
            left: 12,
            right: 12,
          }}
        >
          <CartesianGrid />
          <XAxis
            dataKey="wavenumber"
            tickLine={true}
            axisLine={true}
            tickMargin={8}
            interval={99}
            label={{
              value: "Wavenumber (cm⁻¹)",
              position: "insideBottom",
              offset: 50,
            }}
          />
          <YAxis
            dataKey="absorbance"
            tickLine={true}
            axisLine={true}
            tickMargin={8}
            domain={[-10, 90]}
            interval="preserveStartEnd"
            label={{
              value: "Absorbance (mAU)",
              angle: -90,
              position: "left",
            }}
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
        max={Math.max(allTimestamps.length - 1, 0)}
        step={1}
        value={[displayedIndex]}
        onValueChange={(value) => {
          setDraftIndex(value[0] ?? 0);
        }}
        onValueCommit={handleIndexCommit}
        disabled={isSliderDisabled}
      />

      <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm">
          <p className="text-muted-foreground">Connection Status:</p>
          <Badge>{connectionStatus}</Badge>
          <p>
            Current Timestamp:{" "}
            {currentTimestamp
              ? new Date(currentTimestamp).toLocaleString()
              : "Unavailable"}
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

              handleControlChange(value);
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
