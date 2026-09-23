import { expect, test, Page, Request } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const USER = {
  country: "South Africa",
  phone: "0821234567",
  firstName: "Keagile",
  lastName: "Keamogetswe",
  dob: "1998-04-12",
  code: null as string | null,
};

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost";

test.use({ defaultBrowserType: "chromium" });
test.describe.configure({ mode: "serial" });

/** Step 1 — phone number + country */
async function submitPhoneStep(page: Page) {
  await page.goto(`${BASE}/start/`);

  await page.locator("#country").selectOption(USER.country);
  await expect(page.getByLabel("Dial Code")).toHaveValue("+27");

  await page.locator("#phone").fill(USER.phone);
  await page.getByRole("button", { name: "Next", exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "Create an Account" }),
  ).toBeVisible();
}

/** Step 2 — profile details */
async function submitProfileStep(page: Page) {
  await page.locator("#firstName").fill(USER.firstName);
  await page.locator("#lastName").fill(USER.lastName);
  await page.locator("#dob").fill(USER.dob);

  await page.getByRole("button", { name: "Complete Registration" }).click();

  await expect(page).toHaveURL(/\/start\/verify\/?\?token=/);
}

/** Step 3 — verification code */
async function submitVerificationStep(page: Page) {
  const otpInputs = page.locator(
    [
      'input[name^="otp"]',
      'input[autocomplete="one-time-code"]',
      'input[inputmode="numeric"]',
      'input[type="number"]',
      'input[type="tel"]',
    ].join(", "),
  );

  await expect(otpInputs.first()).toBeVisible();

  if (!USER.code) {
    throw new Error("USER.code is not set before submitVerificationStep");
  }

  if ((await otpInputs.count()) > 1) {
    for (const [i, digit] of [...USER.code].entries()) {
      await otpInputs.nth(i).fill(digit);
    }
  } else {
    await otpInputs.first().fill(USER.code);
  }

  await page.getByRole("button", { name: /verify|confirm/i }).click();
}

test.setTimeout(60_000);

test("submits profile data as an authenticated request", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium",
    "The profile setup flow is covered once in Chromium.",
  );

  await submitPhoneStep(page);
  await submitProfileStep(page);

  // 1. Wait briefly for backend to finish writing code.txt
  await new Promise((resolve) => setTimeout(resolve, 300));
  const code = await readFileContents("./../../../tests/.output/code.txt");
  USER.code = code;

  // 2. Verification should replace the verify route with profile setup.
  await submitVerificationStep(page);
  await expect(page).toHaveURL(/\/profile-setup\/?$/);

  // Path to test.profile-pic.jpg located in the tests directory
  const imageFilePath = path.join(__dirname, "test.profile-pic.jpg");

  await page.locator('input[type="file"]').setInputFiles(imageFilePath);
  await expect(page.getByAltText("Profile preview")).toBeVisible();
  await page.getByLabel("Your Bio").fill("Building reliable software.");

  // 4. Intercept network request payload
  let capturedRequest: Request | null = null;
  let rawBuffer: Buffer | null = null;

  await page.route("**/api/start/profile", async (route) => {
    capturedRequest = route.request();
    rawBuffer = route.request().postDataBuffer();
    await route.continue();
  });

  const saveButton = page.getByRole("button", {
    name: "Save and continue",
    exact: true,
  });

  await expect(saveButton).toBeEnabled();

  // Execute click and wait for API response
  const [apiResponse] = await Promise.all([
    page.waitForResponse(
      (res) =>
        res.request().method() === "POST" &&
        res.url().includes("/api/start/profile"),
    ),
    saveButton.click(),
  ]);

  expect(
    apiResponse.status(),
    `API call failed with status ${apiResponse.status()}`,
  ).toBeLessThan(400);

  // Take screenshot right before navigation
  await page.screenshot({ path: "before-chats-redirect.png", fullPage: true });

  // 5. Wait for redirect to /chats/
  await page.waitForURL(/\/chats\/?$/, { timeout: 30_000 });

  expect(
    capturedRequest,
    "Target request should have been triggered",
  ).not.toBeNull();
  expect(rawBuffer, "Request payload buffer should exist").not.toBeNull();

  const contentType = capturedRequest!.headers()["content-type"];
  const body = rawBuffer!.toString("latin1");

  expect(capturedRequest!.headers()["authorization"]).toMatch(/^Bearer \S+$/);
  expect(contentType).toMatch(/^multipart\/form-data; boundary=/);
  expect(body).toContain('name="bio"');
  expect(body).toContain("Building reliable software.");
  expect(body).toContain('name="profile_picture"');
  expect(body).toContain('filename="test.profile-pic.jpg"');
});

function readFileContents(path: string): Promise<string> {
  return readFile(path, "utf8");
}
