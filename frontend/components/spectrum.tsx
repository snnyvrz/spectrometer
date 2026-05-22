"use client";

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import type { TimestampsResult } from "@/api/fetch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useSpectrumController } from "@/components/use-spectrum-controller";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

import { Slider } from "./ui/slider";
import { Badge } from "./ui/badge";
import { Toggle } from "./ui/toggle";
import { AlertCircle, Link, Play, RotateCcw, Square } from "lucide-react";
import { useRouter } from "next/navigation";

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
  const {
    apiError,
    chartData,
    connectionStatus,
    controlState,
    currentTimestamp,
    displayedIndex,
    handleControlChange,
    handleIndexCommit,
    isConnectionOpen,
    isDisconnectDisabled,
    isSliderDisabled,
    isStartDisabled,
    isStopDisabled,
    setActionError,
    setDraftIndex,
    setShouldConnect,
    shouldConnect,
    timestampsCount,
  } = useSpectrumController({ timestamps });

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
            onClick={() => {
              setActionError(null);
              router.refresh();
            }}
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
        max={Math.max(timestampsCount - 1, 0)}
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
