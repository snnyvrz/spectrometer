"use client";

import { Suspense } from "react";

import { Spectrum } from "@/components/spectrum";

export function Dashboard({ timestamps }: { timestamps: Promise<string[]> }) {
  return (
    <Suspense fallback={<div>Loading timestamps...</div>}>
      <Spectrum timestamps={timestamps} />
    </Suspense>
  );
}
