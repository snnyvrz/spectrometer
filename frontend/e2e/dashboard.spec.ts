import { expect, test } from "@playwright/test";

test("dashboard can connect to the backend and control the simulator", async ({
  page,
}) => {
  await page.goto("/");

  await expect(
    page.getByText(
      /First you need to connect to the server, then you can control the simulator/i,
    ),
  ).toBeVisible();

  await expect(page.getByText(/Connection Status:/i)).toBeVisible();
  await expect(page.getByText(/Current Timestamp:/i)).toBeVisible();

  await page.getByRole("button", { name: /connect/i }).click();

  await expect(page.getByText(/^Open$/)).toBeVisible({ timeout: 15000 });

  const startButton = page.getByRole("radio", { name: /^Start$/i });
  const stopButton = page.getByRole("radio", { name: /^Stop$/i });
  const slider = page.getByRole("slider");

  await expect(startButton).toBeEnabled();
  await expect(slider).toBeEnabled();

  await startButton.click();
  await expect(stopButton).toBeEnabled({ timeout: 15000 });
  await expect(slider).toBeDisabled();

  await stopButton.click();
  await expect(startButton).toBeEnabled({ timeout: 15000 });
});
