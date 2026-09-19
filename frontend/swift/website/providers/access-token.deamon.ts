import { unauthorized } from "next/navigation";
import { renewAccessToken } from "./renew.method";

export const AccessTokenDeamon = (() => {
  let subscribers: ((token: string | null) => void)[] = [];
  let running_state: "running" | "stopped" | "paused" = "stopped";
  let access_token: string | null = null;
  let renews_at: number = 0;
  let renewal_timer: ReturnType<typeof setTimeout> | null = null;
  let renew_in_flight: Promise<string | null> | null = null;

  // Retry configuration
  let retry_count = 0;
  const INITIAL_RETRY_DELAY = 1000; // 1 second
  const MAX_RETRY_DELAY = 30000; // Cap at 30 seconds max backoff
  // Unauthorise callback
  let unauthorizedCallback: ((state: boolean) => void) | null = null;
  let accesss_unauth_token_attempts = 0;
  function notify_subscribers(token: string | null) {
    subscribers.forEach((callback) => {
      try {
        callback(token);
      } catch (error) {
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

  // Calculate exponential backoff delay capped at MAX_RETRY_DELAY
  function get_backoff_delay(): number {
    const calculated_delay = INITIAL_RETRY_DELAY * Math.pow(2, retry_count);
    return Math.min(calculated_delay, MAX_RETRY_DELAY);
  }

  // Helper function to check browser connectivity
  function is_online(): boolean {
    return typeof window !== "undefined" && typeof navigator !== "undefined"
      ? navigator.onLine
      : true;
  }

  // Renew the access token with error handling
  async function renew(): Promise<string | null> {
    if (renew_in_flight) return renew_in_flight;

    // Do not attempt network request if device is offline
    if (!is_online()) {
      return null;
    }

    renew_in_flight = (async () => {
      try {
        if (accesss_unauth_token_attempts > 3 && unauthorizedCallback) {
          unauthorizedCallback(true);
        }
        const token = await renewAccessToken();
        if ([400, 402].includes(token as any)) {
          accesss_unauth_token_attempts++;
        }
        if (typeof token !== "string") {
          notify_subscribers(null);
          return null;
        }
        accesss_unauth_token_attempts = 0;
        if (unauthorizedCallback) unauthorizedCallback(false);
        AccessTokenDeamon.start();

        access_token = token;
        renews_at = Date.now() + 2.5 * 60 * 1000; // Token expiry in 3 min, renew 30s before
        retry_count = 0; // Reset backoff on success
        notify_subscribers(token);
        return token;
      } catch (error) {
        console.error("Token renewal error:", error);
        return null;
      }
    })();

    try {
      return await renew_in_flight;
    } finally {
      renew_in_flight = null;
    }
  }

  // Schedules token renewal or triggers exponential backoff retry
  async function schedule_renewal() {
    if (running_state !== "running") return;

    clear_renewal_timer();

    let delay: number;

    if (!access_token || Date.now() >= renews_at) {
      // In a failed state or missing token -> Exponential Backoff
      delay = get_backoff_delay();
      retry_count++;
    } else {
      // Normal schedule based on token expiration
      delay = Math.max(renews_at - Date.now(), 0);
    }

    renewal_timer = setTimeout(async () => {
      if (running_state !== "running") return;

      if (is_online()) {
        const result = await renew();
        if (!result) {
          notify_subscribers(null);
        }
      }

      await schedule_renewal();
    }, delay);
  }

  // Handle immediate recovery when browser returns online
  const handle_online = () => {
    if (running_state === "running") {
      retry_count = 0; // Reset backoff when internet reconnects
      schedule_renewal();
    }
  };

  function setup_network_listeners() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", handle_online);
    }
  }

  function remove_network_listeners() {
    if (typeof window !== "undefined") {
      window.removeEventListener("online", handle_online);
    }
  }
  return {
    setUnauthorizedCallback(callback: (state: boolean) => void) {
      unauthorizedCallback = callback;
    },
    fetch: async (url: string, options?: RequestInit) => {
      if (!access_token || renews_at <= Date.now()) {
        await renew();
      }

      const fetch_with_auth_header = async (): Promise<Response> => {
        const headers = new Headers(options?.headers || {});
        if (access_token) {
          headers.set("Authorization", `Bearer ${access_token}`);
        }

        return fetch(url, {
          ...options,
          headers,
        });
      };

      let request = await fetch_with_auth_header();
      if (request.status === 401) {
        await renew();
        const retry_request = await fetch_with_auth_header();
        if (retry_request.status === 401) {
          throw new Error(
            "Unauthorized after retrying with renewed access token",
          );
        }
        request = retry_request;
      }
      return request;
    },

    start: async () => {
      if (running_state === "running") return;
      running_state = "running";
      setup_network_listeners();

      if ((!access_token || renews_at <= Date.now()) && is_online()) {
        const token = await renew();
        if (!token) {
          notify_subscribers(null);
        }
      }

      await schedule_renewal();
    },

    stop: async () => {
      running_state = "stopped";
      clear_renewal_timer();
      remove_network_listeners();
    },

    pause: async () => {
      running_state = "paused";
      clear_renewal_timer();
    },

    subscribe: (callback: (token: string | null) => void) => {
      subscribers.push(callback);
      try {
        callback(access_token);
      } catch (error) {
        console.error(error);
      }
      return true;
    },

    unsubscribe: (callback: (token: string | null) => void) => {
      subscribers = subscribers.filter((sub) => sub !== callback);
      return true;
    },
  };
})();
