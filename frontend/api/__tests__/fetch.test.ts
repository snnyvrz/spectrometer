import { beforeEach, describe, expect, it, vi } from "vitest";

import { getTimestamps } from "@/api/fetch";

const safeGetMock = vi.fn();

vi.mock("@/api", () => ({
  safeGet: (...args: unknown[]) => safeGetMock(...args),
}));

describe("getTimestamps", () => {
  beforeEach(() => {
    safeGetMock.mockReset();
  });

  it("returns timestamps from a successful response", async () => {
    safeGetMock.mockResolvedValue({
      data: { timestamps: ["2026-05-22T10:00:00Z"] },
      error: null,
    });

    await expect(getTimestamps()).resolves.toEqual({
      timestamps: ["2026-05-22T10:00:00Z"],
      error: null,
    });
    expect(safeGetMock).toHaveBeenCalledWith("simulation/timestamps");
  });

  it("normalizes fetch errors into the timestamps shape", async () => {
    safeGetMock.mockResolvedValue({ data: null, error: "backend said no" });

    await expect(getTimestamps()).resolves.toEqual({
      timestamps: [],
      error: "Failed to fetch timestamps: backend said no",
    });
  });
});
