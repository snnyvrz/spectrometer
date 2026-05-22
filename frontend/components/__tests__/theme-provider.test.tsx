import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider } from "@/components/theme-provider";

const nextThemesProviderMock = vi.fn(
  ({ children }: { children: React.ReactNode }) => (
    <div data-testid="next-themes-provider">{children}</div>
  ),
);

vi.mock("next-themes", () => ({
  ThemeProvider: (props: { children: React.ReactNode }) =>
    nextThemesProviderMock(props),
}));

describe("ThemeProvider", () => {
  beforeEach(() => {
    nextThemesProviderMock.mockClear();
  });

  it("passes props through to next-themes and renders children", () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <span>Dashboard</span>
      </ThemeProvider>,
    );

    expect(screen.getByTestId("next-themes-provider")).toHaveTextContent(
      "Dashboard",
    );
    expect(nextThemesProviderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        attribute: "class",
        defaultTheme: "system",
        enableSystem: true,
      }),
    );
  });
});
