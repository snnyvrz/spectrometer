import { cacheLife } from "next/cache";
import { get } from ".";

export const getTimestamps = async () => {
  "use cache";
  cacheLife("hours");
  const response = await get<{ data: { timestamps: string[] } }>(
    "simulation/timestamps/",
  );
  return response.data.timestamps;
};
