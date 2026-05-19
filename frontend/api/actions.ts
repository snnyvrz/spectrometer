"use server";

import { patch } from ".";

export async function start() {
  try {
    await patch("simulation/start");
  } catch (error) {
    throw new Error("Failed to start simulation: " + (error as Error).message);
  }
}

export async function stop() {
  try {
    await patch("simulation/stop");
  } catch (error) {
    throw new Error("Failed to stop simulation: " + (error as Error).message);
  }
}

export async function setIndex(index: number) {
  try {
    return await patch<{ data: { index: number } }>("simulation/index", {
      index,
    });
  } catch (error) {
    throw new Error(
      "Failed to set simulation index: " + (error as Error).message,
    );
  }
}
