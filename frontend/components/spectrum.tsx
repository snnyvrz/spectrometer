"use client";

import { CartesianGrid, Line, LineChart, XAxis } from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

import useWebSocket, { ReadyState } from "react-use-websocket";
import { use, useEffect, useState } from "react";
import { Slider } from "./ui/slider";
import { setIndex } from "@/api/actions";

const WEBSOCKET_BASE_URL = (
  process.env.NEXT_PUBLIC_WS_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/^http/, "ws") ??
  "ws://localhost:8000"
).replace(/\/$/, "");

const chartConfig = {
  absorbance: {
    label: "Absorbance",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function Spectrum({ timestamps }: { timestamps: Promise<string[]> }) {
  const [chartData, setChartData] = useState<
    { wavenumber: number; absorbance: number }[]
  >([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isUpdatingIndex, setIsUpdatingIndex] = useState(false);

  const allTimestamps = use(timestamps);

  const { lastJsonMessage, readyState } = useWebSocket<{
    timestamp: string;
    spectrum: number[];
  }>(`${WEBSOCKET_BASE_URL}/ws/spectrum`);

  const connectionStatus = {
    [ReadyState.CONNECTING]: "Connecting",
    [ReadyState.OPEN]: "Open",
    [ReadyState.CLOSING]: "Closing",
    [ReadyState.CLOSED]: "Closed",
    [ReadyState.UNINSTANTIATED]: "Uninstantiated",
  }[readyState];

  useEffect(() => {
    if (lastJsonMessage) {
      const newChartData = lastJsonMessage.spectrum.map(
        (absorbance, index) => ({
          wavenumber: index + 1000,
          absorbance,
        }),
      );
      setChartData(newChartData);

      const nextIndex = allTimestamps.indexOf(lastJsonMessage.timestamp);

      if (nextIndex >= 0) {
        setSelectedIndex(nextIndex);
      }
    }
  }, [allTimestamps, lastJsonMessage]);

  const handleIndexCommit = async (value: number[]) => {
    const nextIndex = value[0] ?? 0;

    setSelectedIndex(nextIndex);
    setIsUpdatingIndex(true);

    try {
      await setIndex(nextIndex);
    } catch (error) {
      console.error("Failed to set index:", error);
    } finally {
      setIsUpdatingIndex(false);
    }
  };

  return (
    <div className="grow w-full max-w-4xl">
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
            tickLine={false}
            axisLine={false}
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
        onValueChange={(value) => setSelectedIndex(value[0] ?? 0)}
        onValueCommit={handleIndexCommit}
        disabled={isUpdatingIndex}
      />
    </div>
  );
}
