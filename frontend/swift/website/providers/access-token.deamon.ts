type RenewAccessToken = () => Promise<string | number>;

type AccessTokenSnapshot = {
  access_token: string | null;
  expires_at: number;
};

type AccessTokenListener = (snapshot: AccessTokenSnapshot) => void;

type TimeoutId = ReturnType<typeof globalThis.setTimeout> | number;

type AccessTokenDeamonDependencies = {
  now: () => number;
  setTimeout: (callback: () => void, delay: number) => TimeoutId;
  clearTimeout: (timeoutId: TimeoutId) => void;
  fetch: typeof globalThis.fetch;
};

const ACCESS_TOKEN_LIFETIME_MS = 3 * 60 * 1000;
const RENEWAL_LEAD_TIME_MS = 30 * 1000;

export function createAccessTokenDeamon(
  dependencyOverrides: Partial<AccessTokenDeamonDependencies> = {},
) {
  const dependencies: AccessTokenDeamonDependencies = {
    now: () => Date.now(),
    setTimeout: (callback, delay) => globalThis.setTimeout(callback, delay),
    clearTimeout: (timeoutId) => globalThis.clearTimeout(timeoutId),
    fetch: globalThis.fetch.bind(globalThis),
    ...dependencyOverrides,
  };

  let access_token: string | null = null;
  let expires_at = 0;
  let isRunning = false;
  let renewAccessToken: RenewAccessToken | null = null;
  let timeoutId: TimeoutId | null = null;
  const listeners = new Set<AccessTokenListener>();

  function snapshot(): AccessTokenSnapshot {
    return { access_token, expires_at };
  }

  function notifyListeners() {
    const currentSnapshot = snapshot();
    listeners.forEach((listener) => listener(currentSnapshot));
  }

  function clearRenewalTimeout() {
    if (timeoutId !== null) {
      dependencies.clearTimeout(timeoutId);
      timeoutId = null;
    }
  }

  async function renew(): Promise<string | number> {
    if (!renewAccessToken) {
      throw new Error("Access token daemon has not been started.");
    }

    return renewAccessToken();
  }

  function scheduleRenewal() {
    clearRenewalTimeout();

    if (!isRunning || !access_token || !expires_at) {
      return;
    }

    const delay = Math.max(
      expires_at - dependencies.now() - RENEWAL_LEAD_TIME_MS,
      0,
    );

    timeoutId = dependencies.setTimeout(() => {
      timeoutId = null;
      void renew().catch((error) => {
        console.error("Scheduled access token renewal failed:", error);
      });
    }, delay);
  }

  function update(
    nextAccessToken: string | null,
    nextExpiresAt = nextAccessToken
      ? dependencies.now() + ACCESS_TOKEN_LIFETIME_MS
      : 0,
  ) {
    access_token = nextAccessToken;
    expires_at = nextExpiresAt;
    scheduleRenewal();
    notifyListeners();
  }

  async function getFreshAccessToken(): Promise<string> {
    if (access_token && expires_at > dependencies.now()) {
      return access_token;
    }

    const renewalResult = await renew();
    if (typeof renewalResult !== "string") {
      throw new Error(
        `Unable to renew access token. Server responded with status ${renewalResult}.`,
      );
    }

    return renewalResult;
  }

  async function fetchWithAccessToken(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const request = new Request(input, init);

    const sendRequest = async (token: string) => {
      const headers = new Headers(request.headers);
      headers.set("Authorization", `Bearer ${token}`);

      return dependencies.fetch(
        new Request(request.clone(), {
          headers,
        }),
      );
    };

    const initialToken = await getFreshAccessToken();
    const response = await sendRequest(initialToken);

    if (response.status !== 400) {
      return response;
    }

    const renewalResult = await renew();
    if (typeof renewalResult !== "string") {
      return response;
    }

    return sendRequest(renewalResult);
  }

  return {
    start(renewalCallback: RenewAccessToken) {
      renewAccessToken = renewalCallback;
      isRunning = true;
      scheduleRenewal();
    },
    stop() {
      isRunning = false;
      renewAccessToken = null;
      clearRenewalTimeout();
    },
    update,
    subscribe(listener: AccessTokenListener) {
      listeners.add(listener);
      listener(snapshot());

      return () => {
        listeners.delete(listener);
      };
    },
    fetch: fetchWithAccessToken,
  };
}

export const AccessTokenDeamon = createAccessTokenDeamon();
