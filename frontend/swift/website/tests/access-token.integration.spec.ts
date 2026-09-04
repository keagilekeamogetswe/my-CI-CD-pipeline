import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

const BASE = "http://localhost";
const VERIFICATION_CODE_PATH = "./../../../tests/.output/code.txt";

test.skip(
  ({ browserName }) => browserName !== "chromium",
  "The refresh-token integration is covered once in Chromium.",
);

test.setTimeout(60_000);

test("renews an access token when a valid refresh token cookie is available", async ({
  context,
  page,
}) => {
  const phone = `082${String(Date.now()).slice(-7)}`;
  const startResponse = await page.request.post(`${BASE}/api/start/`, {
    data: {
      name: "Keagile",
      lastname: "Keamogetswe",
      dob: "1998-04-12",
      phone: {
        code: "+27",
        body: phone,
        dial_code_id: 2,
      },
    },
  });

  expect(startResponse.status()).toBe(200);
  const { verification_token } = await startResponse.json();
  expect(verification_token).toEqual(expect.any(String));

  const code = (await readFile(VERIFICATION_CODE_PATH, "utf8")).trim();
  const verificationResponse = await page.request.post(
    `${BASE}/api/start/verify/`,
    {
      data: {
        code,
        verification_token,
      },
    },
  );

  expect(verificationResponse.status()).toBe(200);

  const refreshTokenBeforeRenewal = (await context.cookies(BASE)).find(
    (cookie) => cookie.name === "refresh_token",
  );
  expect(refreshTokenBeforeRenewal?.value).toEqual(expect.any(String));

  const renewalResponse = await page.request.get(`${BASE}/api/access-token/`);
  const renewalBody = await renewalResponse.json();

  expect(renewalResponse.status()).toBe(200);
  expect(renewalBody.access_token).toEqual(expect.any(String));

  const refreshTokenAfterRenewal = (await context.cookies(BASE)).find(
    (cookie) => cookie.name === "refresh_token",
  );
  expect(refreshTokenAfterRenewal?.value).not.toBe(
    refreshTokenBeforeRenewal?.value,
  );
});

test("rejects renewal when the refresh token cookie is not set", async ({
  context,
  page,
}) => {
  await context.clearCookies();

  const response = await page.request.get(`${BASE}/api/access-token/`);

  expect(response.status()).toBe(400);
  await expect(response.json()).resolves.toMatchObject({
    error: "Refresh token not supplied",
  });
});

test("rejects renewal when the refresh token cookie is invalid", async ({
  context,
  page,
}) => {
  await context.addCookies([
    {
      name: "refresh_token",
      value: "invalid-refresh-token",
      url: BASE,
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);

  const response = await page.request.get(`${BASE}/api/access-token/`);

  expect(response.status()).toBe(400);
  await expect(response.json()).resolves.toMatchObject({
    error: expect.any(String),
  });
});
