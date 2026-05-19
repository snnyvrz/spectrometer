import { cacheLife } from "next/cache";
import { get } from ".";

export const getTimestamps = async () => {
  "use cache";
  cacheLife("hours");
  try {
    const response = await get<{ timestamps: string[] }>(
      "simulation/timestamps",
    );
    return response.timestamps;
  } catch (error) {
    throw new Error("Failed to fetch timestamps: " + (error as Error).message);
  }
};
