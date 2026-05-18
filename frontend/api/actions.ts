"use server";

import { post } from ".";

export async function start() {
  await post("simulation/start/");
}

export async function stop() {
  await post("simulation/stop/");
}

export async function setIndex(index: number) {
  return await post<{ data: { index: number } }>("simulation/index/", {
    index,
  });
}
