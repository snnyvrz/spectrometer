import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type ApiModule = typeof import("@/api");

describe("api helpers", () => {
  const originalBaseUrl = process.env.API_BASE_URL;
  let api: ApiModule;

  beforeEach(() => {
    process.env.API_BASE_URL = "http://api.test";
    vi.stubGlobal("fetch", vi.fn());
    vi.resetModules();
  });

  afterEach(() => {
    process.env.API_BASE_URL = originalBaseUrl;
    vi.unstubAllGlobals();
  });

  async function loadApi() {
    api = await import("@/api");
  }

  it("parses successful GET responses", async () => {
    await loadApi();

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { timestamps: ["2026-05-22T10:00:00Z"] },
        error: null,
      }),
    } as Response);

    await expect(
      api.get<{ timestamps: string[] }>("simulation/timestamps"),
    ).resolves.toEqual({ timestamps: ["2026-05-22T10:00:00Z"] });

    expect(fetch).toHaveBeenCalledWith("http://api.test/simulation/timestamps");
  });

  it("returns safe errors for API failures", async () => {
    await loadApi();

    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: async () => ({
        data: null,
        error: { code: "bad_request", message: "backend said no" },
      }),
    } as Response);

    await expect(api.safeGet("simulation/timestamps")).resolves.toEqual({
      data: null,
      error: "backend said no",
    });
  });

  it("sends PATCH requests with JSON bodies", async () => {
    await loadApi();

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { index: 4 },
        error: null,
      }),
    } as Response);

    await expect(
      api.patch<{ index: number }>("simulation/index", { index: 4 }),
    ).resolves.toEqual({ index: 4 });

    expect(fetch).toHaveBeenCalledWith("http://api.test/simulation/index", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ index: 4 }),
    });
  });

  it("converts invalid responses into safe patch errors", async () => {
    await loadApi();

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: null,
        error: null,
      }),
    } as Response);

    await expect(
      api.safePatch("simulation/index", { index: 2 }),
    ).resolves.toEqual({
      data: null,
      error: "Missing response data",
    });
  });

  it("falls back to a generic error for non-Error failures", async () => {
    await loadApi();

    vi.mocked(fetch).mockRejectedValue("network down");

    await expect(api.safeGet("simulation/timestamps")).resolves.toEqual({
      data: null,
      error: "Request failed",
    });
  });

  it("reports status errors when a non-json error response is returned", async () => {
    await loadApi();

    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => {
        throw new Error("not json");
      },
    } as Response);

    await expect(api.get("simulation/timestamps")).rejects.toThrow(
      "Request failed with status 503",
    );
  });

  it("rejects invalid successful responses that cannot be parsed", async () => {
    await loadApi();

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => {
        throw new Error("not json");
      },
    } as Response);

    await expect(api.get("simulation/timestamps")).rejects.toThrow(
      "Invalid API response",
    );
  });

  it("uses a default message when an error payload omits the message", async () => {
    await loadApi();

    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: async () => ({
        data: null,
        error: null,
      }),
    } as Response);

    await expect(api.patch("simulation/stop")).rejects.toThrow(
      "Request failed",
    );
  });

  it("omits the patch body when no payload is provided", async () => {
    await loadApi();

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { ok: true },
        error: null,
      }),
    } as Response);

    await expect(
      api.patch<{ ok: boolean }>("simulation/start"),
    ).resolves.toEqual({
      ok: true,
    });

    expect(fetch).toHaveBeenCalledWith("http://api.test/simulation/start", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: undefined,
    });
  });
});
