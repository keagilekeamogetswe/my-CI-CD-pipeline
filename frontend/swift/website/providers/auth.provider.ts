"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LoadingSplashScreen } from "@/app/splash";
import StartPage from "@/app/(entry)/start/page";

type AuthContextValue = {
  access_token: string | null;
  expires_at: number;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextValue>({
  access_token: null,
  expires_at: 0,
  isLoading: true,
});

// Determines if the current path allows unauthenticated access (e.g., login or onboarding).
export function useIsPublicRoute() {
  const pathname = usePathname();
  return Boolean(
    pathname &&
    (pathname.startsWith("/account") || pathname.startsWith("/start")),
  );
}

// Global promise cache to deduplicate concurrent token renewal requests.
let renewPromise: Promise<string | number> | null = null;

export async function renewAccessToken(): Promise<string | number> {
  if (renewPromise) {
    return renewPromise;
  }
  renewPromise = (async () => {
    try {
      const request = await fetch("/api/access-token", {
        method: "GET",
        credentials: "include",
      });
      const data = await request.json();
      const { access_token } = data;

      if (request.ok) {
        return access_token;
      }
      return request.status;
    } catch (error) {
      console.error("Failed to renew access token:", error);
      return 500;
    } finally {
      renewPromise = null;
    }
  })();
  return renewPromise;
}

export function AuthContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const isPublicRoute = useIsPublicRoute();
  const [access_token, setAccessToken] = useState<string | null>(null);
  const [expires_at, setExpiresAt] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorCode, setErrorCode] = useState<number | null>(null);

  // Fetch access token on initial mount and guard against state updates on unmounted component
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const tokenResult = await renewAccessToken();
      if (!isMounted) return;
      if (typeof tokenResult === "string") {
        setAccessToken(tokenResult);
        setExpiresAt(Date.now() + 3 * 60 * 1000);
      } else {
        setAccessToken(null);
        setExpiresAt(0);
        setErrorCode(tokenResult);
      }
      setIsLoading(false);
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // Redirect unauthenticated users attempting to access protected routes
  useEffect(() => {
    if (!isLoading && !access_token && !isPublicRoute) {
      const query = errorCode ? `?redirected_with=${errorCode}` : "";
      router.replace(`/start${query}`);
    }
  }, [isLoading, access_token, isPublicRoute, errorCode, router]);

  // Route protection UI: display loading splash screen or fallback entry page on protected routes
  let child_to_render: React.ReactNode = children;
  if (isLoading && !isPublicRoute) {
    child_to_render = React.createElement(LoadingSplashScreen);
  } else if (!isPublicRoute && !access_token) {
    child_to_render = React.createElement(StartPage);
  }

  return React.createElement(AuthContext.Provider, {
    value: { access_token, expires_at, isLoading },
    children: child_to_render,
  });
}

export function useAuth() {
  return useContext(AuthContext);
}
