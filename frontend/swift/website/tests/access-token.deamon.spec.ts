import { expect, test } from "@playwright/test";
import { createAccessTokenDeamon } from "@/providers/access-token.deamon";

test("uses injected timers to schedule renewal before token expiry", async () => {
  const scheduled: {
    callback?: () => void;
    delay: number;
  } = { delay: -1 };
  let renewalCount = 0;

  const deamon = createAccessTokenDeamon({
    now: () => 1_000,
    setTimeout: (callback, delay) => {
      scheduled.callback = callback;
      scheduled.delay = delay;
      return 1;
    },
    clearTimeout: () => {},
  });

  deamon.start(async () => {
    renewalCount += 1;
    deamon.update("renewed-token", 181_000);
    return "renewed-token";
  });
  deamon.update("initial-token", 181_000);

  expect(scheduled.delay).toBe(150_000);
  expect(scheduled.callback).toBeDefined();

  scheduled.callback?.();
  await expect.poll(() => renewalCount).toBe(1);

  deamon.stop();
});

test("adds a bearer token and retries once after a 400 response", async () => {
  const authorizationHeaders: Array<string | null> = [];
  let requestCount = 0;

  const deamon = createAccessTokenDeamon({
    now: () => 1_000,
    setTimeout: () => 1,
    clearTimeout: () => {},
    fetch: async (input) => {
      const request = input instanceof Request ? input : new Request(input);
      authorizationHeaders.push(request.headers.get("Authorization"));
      requestCount += 1;

      return new Response(null, {
        status: requestCount === 1 ? 400 : 200,
      });
    },
  });

  deamon.start(async () => {
    deamon.update("renewed-token", 181_000);
    return "renewed-token";
  });
  deamon.update("initial-token", 181_000);

  const response = await deamon.fetch("http://localhost/api/private");

  expect(response.status).toBe(200);
  expect(authorizationHeaders).toEqual([
    "Bearer initial-token",
    "Bearer renewed-token",
  ]);

  deamon.stop();
});
