"use client";

import { start, stop, setIndex } from "@/api/actions";
import type { TimestampsResult } from "@/api/fetch";
import useWebSocket, { ReadyState } from "react-use-websocket";
import { use, useEffect, useRef, useState, useTransition } from "react";

export type ConnectionStatus =
  | "Connecting"
  | "Open"
  | "Closing"
  | "Closed"
  | "Uninstantiated";

type SpectrumMessage = {
  timestamp: string;
  index: number;
  spectrum: number[];
};

const connectionStatusMap: Record<ReadyState, ConnectionStatus> = {
  [ReadyState.CONNECTING]: "Connecting",
  [ReadyState.OPEN]: "Open",
  [ReadyState.CLOSING]: "Closing",
  [ReadyState.CLOSED]: "Closed",
  [ReadyState.UNINSTANTIATED]: "Uninstantiated",
};

const WEBSOCKET_BASE_URL = process.env.NEXT_PUBLIC_WS_BASE_URL;

export function useSpectrumController({
  timestamps,
}: {
  timestamps: Promise<TimestampsResult>;
}) {
  const [shouldConnect, setShouldConnect] = useState(false);
  const [confirmedIndex, setConfirmedIndex] = useState(0);
  const [draftIndex, setDraftIndex] = useState<number | null>(null);
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const [controlState, setControlState] = useState<"start" | "stop">("stop");
  const { timestamps: allTimestamps, error: initialError } = use(timestamps);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPendingStart, startControlTransition] = useTransition();
  const [isPendingStop, stopControlTransition] = useTransition();

  const hasTimestamps = allTimestamps.length > 0;
  const pendingIndexRef = useRef(pendingIndex);

  useEffect(() => {
    pendingIndexRef.current = pendingIndex;
  }, [pendingIndex]);

  const { lastJsonMessage, readyState } = useWebSocket<SpectrumMessage>(
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
  const apiError = actionError ?? initialError;
  const displayedIndex = draftIndex ?? confirmedIndex;
  const chartData = (lastJsonMessage?.spectrum ?? []).map(
    (absorbance, index) => ({
      wavenumber: index + 1000,
      absorbance: absorbance * 1000,
    }),
  );
  const isDisconnectDisabled = shouldConnect && isRunning;
  const isStartDisabled =
    !isConnectionOpen || controlState === "start" || isPendingStart;
  const isStopDisabled =
    !isConnectionOpen || controlState === "stop" || isPendingStop;
  const isSliderDisabled =
    isRunning || pendingIndex !== null || !isConnectionOpen || !hasTimestamps;
  const currentTimestamp = hasTimestamps ? allTimestamps[displayedIndex] : null;

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
      setActionError(result.error);
      setPendingIndex(null);
      setDraftIndex(null);
    } else {
      setActionError(null);
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
          setActionError(result.error);
          setControlState("stop");
          return;
        }

        setActionError(null);
      });

      return;
    }

    stopControlTransition(async () => {
      const result = await stop();

      if (!result.ok) {
        setActionError(result.error);
        setControlState("start");
        return;
      }

      setActionError(null);
    });
  };

  return {
    actionError,
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
    timestampsCount: allTimestamps.length,
  };
}
