import { renewAccessToken } from "./renew.method";

export const AccessTokenDeamon = (() => {
  let subscribers: ((token: string | null) => void)[] = [];
  let running_state: "running" | "stopped" | "paused" = "stopped";
  let access_token: string | null = null;
  let renews_at: number = 0;
  let renewal_timer: ReturnType<typeof setTimeout> | null = null;
  let renew_in_flight: Promise<string | null> | null = null;

  function notify_subscribers(token: string | null) {
    subscribers.forEach((callback) => {
      try {
        callback(token);
      } catch (error) {
        // Ignore subscriber callback failures
        console.error(error);
      }
    });
  }

  function clear_renewal_timer() {
    if (renewal_timer !== null) {
      clearTimeout(renewal_timer);
      renewal_timer = null;
    }
  }

  // renew the access token
  async function renew() {
    if (renew_in_flight) return renew_in_flight;

    renew_in_flight = (async () => {
      const token = await renewAccessToken();
      if (typeof token !== "string") {
        return null;
      }

      access_token = token;
      renews_at = Date.now() + 2.5 * 60 * 1000; // Token expiry in 3 min, renew 30 seconds before
      notify_subscribers(token);
      return token;
    })();

    try {
      return await renew_in_flight;
    } finally {
      renew_in_flight = null;
    }
  }

  // Schedules renewal of the access token based on its renewal time
  async function schedule_renewal() {
    if (running_state !== "running") return;

    clear_renewal_timer();
    const delay = Math.max(renews_at - Date.now(), 0);

    renewal_timer = setTimeout(async () => {
      if (running_state !== "running") return;

      try {
        await renew();
      } finally {
        await schedule_renewal();
      }
    }, delay);
  }

  return {
    fetch: async (url: string, options?: RequestInit) => {
      if (!access_token || renews_at <= Date.now()) {
        await renew();
      }
      console.log(access_token);

      const fetch_with_auth_header = async (): Promise<Response> => {
        const headers = new Headers(options?.headers || {});
        if (access_token) {
          headers.set("Authorization", `Bearer ${access_token}`);
        }
        headers.entries().forEach(([key, value]) => {
          console.log(`${key}: ${value}`);
        });

        return fetch(url, {
          ...options,
          headers,
        });
      };

      let request = await fetch_with_auth_header();
      if (request.status === 401) {
        await renew();
        const retry_request = await fetch_with_auth_header();
        if (retry_request.status === 401)
          throw new Error(
            "Unauthorized after retrying with renewed access token",
          );
        request = retry_request;
      }
      return request;
    },
    start: async () => {
      if (running_state === "running") return;

      running_state = "running";

      if (!access_token || renews_at <= Date.now()) {
        await renew();
      }

      await schedule_renewal();
    },
    stop: async () => {
      running_state = "stopped";
      clear_renewal_timer();
    },
    pause: async () => {
      running_state = "paused";
      clear_renewal_timer();
    },
    subscribe: (callback: (token: string | null) => void) => {
      // Immediately invoke the callback with the current access token
      subscribers.push(callback);
      try {
        callback(access_token);
      } catch {
        // Ignore subscriber callback failures
      }
      return true;
    },
    unsubscribe: (callback: (token: string | null) => void) => {
      subscribers = subscribers.filter((sub) => sub !== callback);
      return true;
    },
  };
})();
