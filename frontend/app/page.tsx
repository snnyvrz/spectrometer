import { Control } from "@/components/control";
import "./globals.css";
import { Spectrum } from "@/components/spectrum";
import { getTimestamps } from "@/api/fetch";
import { Suspense } from "react";
import { connection } from "next/server";

export default async function Home() {
  await connection();
  const timestamps = getTimestamps();

  return (
    <main className="flex flex-col items-center gap-16 container mx-auto p-8 h-screen">
      <Control />
      <Suspense fallback={<div>Loading timestamps...</div>}>
        <Spectrum timestamps={timestamps} />
      </Suspense>
    </main>
  );
}
