import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ModeToggle } from "@/components/mode-toggler";

const setThemeMock = vi.fn();

vi.mock("next-themes", () => ({
  useTheme: () => ({
    setTheme: setThemeMock,
  }),
}));

describe("ModeToggle", () => {
  beforeEach(() => {
    setThemeMock.mockReset();
  });

  it("toggles between light and dark themes", async () => {
    const user = userEvent.setup();

    render(<ModeToggle />);

    await user.click(screen.getByRole("button", { name: /toggle theme/i }));

    expect(setThemeMock).toHaveBeenCalledTimes(1);

    const updateTheme = setThemeMock.mock.calls[0]?.[0] as (
      previous: string,
    ) => string;

    expect(updateTheme("light")).toBe("dark");
    expect(updateTheme("dark")).toBe("light");
  });
});
