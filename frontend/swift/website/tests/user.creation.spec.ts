import { test, expect, Page } from "@playwright/test";
import { readFile } from "node:fs/promises";

const BASE = "http://localhost";

const USER = {
  country: "South Africa",
  phone: "0821234567",
  firstName: "Keagile",
  lastName: "Keamogetswe",
  dob: "1998-04-12",
  code: "123456",
};

// Force this entire test file to run ONLY in Chromium
test.use({ defaultBrowserType: "chromium" });

// Keep serial mode so tests in this file don't run in parallel against each other
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

  if ((await otpInputs.count()) > 1) {
    // one box per digit
    for (const [i, digit] of [...USER.code].entries()) {
      await otpInputs.nth(i).fill(digit);
    }
  } else {
    await otpInputs.first().fill(USER.code);
  }

  await page.getByRole("button", { name: /verify|confirm/i }).click();
}

test("creates a user: phone -> profile -> verification -> refresh_token cookie", async ({
  page,
  context,
}) => {
  await submitPhoneStep(page);
  await submitProfileStep(page);
  await new Promise((resolve) => setTimeout(resolve, 300));
  const code = await readFileContents("./../../../tests/.output/code.txt");
  console.log({ code });
  USER.code = code;
  await submitVerificationStep(page);

  // Verification succeeded and the user is signed in
  await expect(page).not.toHaveURL(/\/start\/verify/);

  const cookies = await context.cookies(BASE);
  const refreshToken = cookies.find((c) => c.name === "refresh_token");

  expect(refreshToken, "refresh_token cookie should be set").toBeDefined();
  expect(refreshToken!.value).not.toEqual("");
  expect(refreshToken!.httpOnly).toBe(true);
});

test("profile step shows the phone entered in step 1 and allows editing it", async ({
  page,
}) => {
  await submitPhoneStep(page);

  await expect(page.getByText(`+27 ${USER.phone}`)).toBeVisible();

  await page.getByRole("button", { name: "Change phone number" }).click();
  await expect(page.locator("#phone")).toHaveValue(USER.phone);
});
function readFileContents(path: string): Promise<string> {
  return readFile(path, "utf8");
}
