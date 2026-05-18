"use client";

import { start, stop } from "@/api/actions";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Play, Square } from "lucide-react";
import { useState } from "react";

export function Control() {
  const [state, setState] = useState<"start" | "stop">("stop");

  return (
    <ToggleGroup
      variant="outline"
      type="single"
      value={state}
      onValueChange={async (value) => {
        setState(value as "start" | "stop");
        if (value === "start") {
          await start();
        } else {
          await stop();
        }
      }}
    >
      <ToggleGroupItem value="start">
        <Play />
        Start
      </ToggleGroupItem>
      <ToggleGroupItem value="stop">
        <Square />
        Stop
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
