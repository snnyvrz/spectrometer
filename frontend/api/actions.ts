"use server";

import { post } from ".";

export async function start() {
  await post("simulation/start");
}

export async function stop() {
  await post("simulation/stop");
}
