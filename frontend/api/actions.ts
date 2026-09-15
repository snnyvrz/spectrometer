"use server";

import { safePatch } from ".";

export type ActionResult = {
  ok: boolean;
  error: string | null;
};

export type SetIndexResult = ActionResult & {
  index?: number;
};

export async function start(): Promise<ActionResult> {
  const response = await safePatch<unknown>("simulation/start");

  return {
    ok: response.error === null,
    error: response.error
      ? `Failed to start simulation: ${response.error}`
      : null,
  };
}

export async function stop(): Promise<ActionResult> {
  const response = await safePatch<unknown>("simulation/stop");

  return {
    ok: response.error === null,
    error: response.error
      ? `Failed to stop simulation: ${response.error}`
      : null,
  };
}

export async function setIndex(index: number): Promise<SetIndexResult> {
  const response = await safePatch<{ index: number }>("simulation/index", {
    index,
  });

  return {
    ok: response.error === null,
    error: response.error
      ? `Failed to set simulation index: ${response.error}`
      : null,
    ...(response.data ? { index: response.data.index } : {}),
  };
}
