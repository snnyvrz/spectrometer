import { beforeEach, describe, expect, it, vi } from "vitest";

import { setIndex, start, stop } from "@/api/actions";

const safePatchMock = vi.fn();

vi.mock("@/api", () => ({
  safePatch: (...args: unknown[]) => safePatchMock(...args),
}));

describe("api actions", () => {
  beforeEach(() => {
    safePatchMock.mockReset();
  });

  it("formats a successful start response", async () => {
    safePatchMock.mockResolvedValue({ data: {}, error: null });

    await expect(start()).resolves.toEqual({ ok: true, error: null });
    expect(safePatchMock).toHaveBeenCalledWith("simulation/start");
  });

  it("formats start failures", async () => {
    safePatchMock.mockResolvedValue({ data: null, error: "backend said no" });

    await expect(start()).resolves.toEqual({
      ok: false,
      error: "Failed to start simulation: backend said no",
    });
  });

  it("formats stop failures", async () => {
    safePatchMock.mockResolvedValue({ data: null, error: "backend said no" });

    await expect(stop()).resolves.toEqual({
      ok: false,
      error: "Failed to stop simulation: backend said no",
    });
    expect(safePatchMock).toHaveBeenCalledWith("simulation/stop");
  });

  it("formats successful stop responses", async () => {
    safePatchMock.mockResolvedValue({ data: {}, error: null });

    await expect(stop()).resolves.toEqual({ ok: true, error: null });
  });

  it("formats index updates with the selected index", async () => {
    safePatchMock.mockResolvedValue({ data: null, error: "out of range" });

    await expect(setIndex(4)).resolves.toEqual({
      ok: false,
      error: "Failed to set simulation index: out of range",
    });
    expect(safePatchMock).toHaveBeenCalledWith("simulation/index", {
      index: 4,
    });
  });

  it("formats successful index updates", async () => {
    safePatchMock.mockResolvedValue({ data: { index: 2 }, error: null });

    await expect(setIndex(2)).resolves.toEqual({ ok: true, error: null });
  });
});
