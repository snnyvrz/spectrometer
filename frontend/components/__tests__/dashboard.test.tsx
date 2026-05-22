import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Dashboard } from "@/components/dashboard";

const spectrumMock = vi.fn(
  ({ timestamps }: { timestamps: Promise<unknown> }) => (
    <div data-testid="spectrum">{String(Boolean(timestamps))}</div>
  ),
);

vi.mock("@/components/spectrum", () => ({
  Spectrum: (props: { timestamps: Promise<unknown> }) => spectrumMock(props),
}));

describe("Dashboard", () => {
  it("renders the spectrum within suspense", async () => {
    const timestamps = Promise.resolve({ timestamps: [], error: null });

    render(<Dashboard timestamps={timestamps} />);

    expect(await screen.findByTestId("spectrum")).toHaveTextContent("true");
    expect(spectrumMock).toHaveBeenCalledWith(
      expect.objectContaining({ timestamps }),
    );
  });
});
