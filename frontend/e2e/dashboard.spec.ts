import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  await request.patch("http://127.0.0.1:8000/simulation/stop");
});

async function connect(page: Page) {
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
}

test("dashboard can connect to the backend and control the simulator", async ({
  page,
}) => {
  await connect(page);

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

test("refreshing during playback resynchronizes the simulator state", async ({
  page,
}) => {
  await connect(page);

  const startButton = page.getByRole("radio", { name: /^Start$/i });
  const stopButton = page.getByRole("radio", { name: /^Stop$/i });
  const slider = page.getByRole("slider");

  await startButton.click();
  await expect(stopButton).toBeEnabled({ timeout: 15000 });
  await expect(slider).toBeDisabled();

  await page.reload();
  await page.getByRole("button", { name: /connect/i }).click();

  await expect(page.getByText(/^Open$/)).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole("radio", { name: /^Stop$/i })).toBeEnabled();
  await expect(page.getByRole("slider")).toBeDisabled();

  await page.getByRole("radio", { name: /^Stop$/i }).click();
  await expect(page.getByRole("radio", { name: /^Start$/i })).toBeEnabled({
    timeout: 15000,
  });
});

test("can disconnect while the simulator is stopped", async ({ page }) => {
  await connect(page);

  const startButton = page.getByRole("radio", { name: /^Start$/i });
  const stopButton = page.getByRole("radio", { name: /^Stop$/i });
  const slider = page.getByRole("slider");
  const disconnectButton = page.getByRole("button", {
    name: "Toggle shouldConnect",
  });

  await expect(startButton).toBeEnabled();
  await expect(stopButton).toBeDisabled();
  await expect(slider).toBeEnabled();

  await disconnectButton.click();

  await expect(page.getByText(/^Closed$/)).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole("button", { name: /connect/i })).toBeEnabled();
  await expect(page.getByRole("slider")).toBeDisabled();
  await expect(page.getByRole("radio", { name: /^Start$/i })).toBeDisabled();
  await expect(page.getByRole("radio", { name: /^Stop$/i })).toBeDisabled();
});
