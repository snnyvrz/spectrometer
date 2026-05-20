"use client";

import { Suspense } from "react";

import type { TimestampsResult } from "@/api/fetch";
import { Spectrum } from "@/components/spectrum";

export function Dashboard({
  timestamps,
}: {
  timestamps: Promise<TimestampsResult>;
}) {
  return (
    <Suspense fallback={<div>Loading timestamps...</div>}>
      <Spectrum timestamps={timestamps} />
    </Suspense>
  );
}
