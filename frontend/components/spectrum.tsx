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
import { useDebounce } from "@/hooks/use-debounce";
import { Slider } from "./ui/slider";
import { setIndex } from "@/api/actions";

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

  const allTimestamps = use(timestamps);
  const debouncedIndex = useDebounce(selectedIndex, 300);

  const { lastJsonMessage, readyState } = useWebSocket<{
    timestamp: string;
    spectrum: number[];
  }>("ws://localhost:8000/ws/spectrum");

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

      const currentIndex = allTimestamps.findIndex(
        (timestamp) => timestamp === lastJsonMessage.timestamp,
      );
      if (currentIndex >= 0) {
        setSelectedIndex(currentIndex);
      }
    }
  }, [allTimestamps, lastJsonMessage]);

  useEffect(() => {
    setIndex(debouncedIndex).catch((error) => {
      console.error("Failed to set index:", error);
    });
  }, [debouncedIndex]);

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
      />
    </div>
  );
}
