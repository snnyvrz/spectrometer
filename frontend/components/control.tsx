"use client";

import { start, stop } from "@/api/actions";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Play, Square } from "lucide-react";
import { startTransition, useActionState, useState } from "react";

export function Control() {
  const [controlState, setControlState] = useState<"start" | "stop">("stop");
  const [_, dispatchStart, isPendingStart] = useActionState(start, null);
  const [__, dispatchStop, isPendingStop] = useActionState(stop, null);

  return (
    <ToggleGroup
      variant="outline"
      type="single"
      value={controlState}
      onValueChange={async (value) => {
        if (value === "start") {
          startTransition(dispatchStart);
        } else {
          startTransition(dispatchStop);
        }
        setControlState(value as "start" | "stop");
      }}
    >
      <ToggleGroupItem
        value="start"
        disabled={controlState === "start" || isPendingStart}
      >
        <Play />
        Start
      </ToggleGroupItem>
      <ToggleGroupItem
        value="stop"
        disabled={controlState === "stop" || isPendingStop}
      >
        <Square />
        Stop
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
