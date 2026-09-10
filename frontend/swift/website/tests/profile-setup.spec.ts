import { expect, test, type Page } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost";

test.skip(
  ({ browserName }) => browserName !== "chromium",
  "The profile setup flow is covered once in Chromium.",
);

test.setTimeout(60_000);

async function mockAccessTokenRenewal(
  page: Page,
  tokens: string[],
) {
  let renewalCount = 0;

  await page.route("**/api/access-token/", async (route) => {
    const token = tokens[Math.min(renewalCount, tokens.length - 1)];
    renewalCount += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ access_token: token }),
    });
  });

  return () => renewalCount;
}

test.skip("submits profile data as an authenticated request", async ({
  page,
}) => {
  const getRenewalCount = await mockAccessTokenRenewal(page, ["access-token"]);
  const profileRequest = page.waitForRequest("**/api/profile-setup");

  await page.route("**/api/profile-setup", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });

  await page.goto(`${BASE}/profile-setup/`);
  await page.locator('input[type="file"]').setInputFiles({
    name: "avatar.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
  });
  await expect(page.getByAltText("Profile preview")).toBeVisible();
  await page.getByLabel("Your Bio").fill("Building reliable software.");
  await page.getByRole("button", { name: "Save and continue" }).click();

  const request = await profileRequest;
  const contentType = request.headers()["content-type"];
  const body = request.postDataJSON();

  expect(request.headers()["authorization"]).toBe("Bearer access-token");
  expect(contentType).toBe("application/json");
  expect(body.bio).toBe("Building reliable software.");
  expect(body.avatar).toMatch(/^data:image\/jpeg;base64,/);
  expect(getRenewalCount()).toBeGreaterThanOrEqual(1);
  await expect(page).toHaveURL(/\/home\/?$/);
});

test.skip("renews an expired token and retries profile setup once", async ({
  page,
}) => {
  const getRenewalCount = await mockAccessTokenRenewal(page, [
    "expired-token",
    "renewed-token",
  ]);
  const authorizationHeaders: string[] = [];

  await page.route("**/api/profile-setup", async (route) => {
    const authorization = route.request().headers()["authorization"];
    authorizationHeaders.push(authorization);

    await route.fulfill({
      status: authorization === "Bearer expired-token" ? 400 : 200,
      contentType: "application/json",
      body: JSON.stringify(
        authorization === "Bearer expired-token"
          ? { error: "Invalid or expired access token" }
          : { success: true },
      ),
    });
  });

  await page.goto(`${BASE}/profile-setup/`);
  await page.getByLabel("Your Bio").fill("Token renewal test.");
  await page.getByRole("button", { name: "Save and continue" }).click();

  await expect(page).toHaveURL(/\/home\/?$/);
  expect(authorizationHeaders).toEqual([
    "Bearer expired-token",
    "Bearer renewed-token",
  ]);
  expect(getRenewalCount()).toBeGreaterThanOrEqual(2);
});

test.skip("shows a server error without retrying", async ({ page }) => {
  const getRenewalCount = await mockAccessTokenRenewal(page, ["access-token"]);
  let profileRequestCount = 0;

  await page.route("**/api/profile-setup", async (route) => {
    profileRequestCount += 1;
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ message: "Unable to save the profile." }),
    });
  });

  await page.goto(`${BASE}/profile-setup/`);
  await page.getByLabel("Your Bio").fill("Invalid profile.");
  await page.getByRole("button", { name: "Save and continue" }).click();

  await expect(page.getByText("Unable to save the profile.")).toBeVisible();
  expect(profileRequestCount).toBe(1);
  expect(getRenewalCount()).toBe(1);
  await expect(page).toHaveURL(/\/profile-setup\/?$/);
});
