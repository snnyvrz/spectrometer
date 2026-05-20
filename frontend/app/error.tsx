"use client";

import { AlertCircle, RotateCcw } from "lucide-react";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="container mx-auto flex min-h-[calc(100vh-6rem)] items-center justify-center p-8">
      <div className="flex w-full max-w-xl flex-col gap-6 rounded-2xl border bg-card p-8 text-card-foreground shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-red-100 p-2 text-red-700 dark:bg-red-950 dark:text-red-300">
            <AlertCircle className="size-5" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              Something went wrong
            </h2>
            <p className="text-sm text-muted-foreground">
              The page hit an unexpected error while rendering. Try again first.
              If the problem persists, refresh the page once the backend is
              healthy.
            </p>
          </div>
        </div>

        <div className="rounded-xl border bg-muted/40 p-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Error details</p>
          <p className="mt-1 wrap-break-word">
            {error.message || "Unknown error"}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground transition-opacity hover:opacity-90"
            onClick={() => reset()}
          >
            <RotateCcw className="size-4" />
            Try again
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md border px-4 py-2 font-medium transition-colors hover:bg-muted"
            onClick={() => window.location.reload()}
          >
            Refresh page
          </button>
        </div>
      </div>
    </main>
  );
}
