import { safeGet } from ".";

export type TimestampsResult = {
  timestamps: string[];
  error: string | null;
};

export const getTimestamps = async () => {
  const response = await safeGet<{ timestamps: string[] }>(
    "simulation/timestamps",
  );

  return {
    timestamps: response.data?.timestamps ?? [],
    error: response.error
      ? `Failed to fetch timestamps: ${response.error}`
      : null,
  } satisfies TimestampsResult;
};
