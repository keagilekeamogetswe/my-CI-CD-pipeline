"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LoadingSplashScreen } from "@/app/splash";
import StartPage from "@/app/(entry)/start/page";
import { AccessTokenDeamon } from "@/providers/access-token.deamon";

type AuthContextValue = {
  access_token: string | null;
  expires_at: number;
  isLoading: boolean;
};

const ACCESS_TOKEN_REQUEST_TIMEOUT_MS = 6_000;

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
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      ACCESS_TOKEN_REQUEST_TIMEOUT_MS,
    );

    try {
      const request = await fetch("/api/access-token/", {
        method: "GET",
        credentials: "include",
        signal: controller.signal,
      });
      const data = await request.json();
      const { access_token } = data;

      if (
        request.ok &&
        typeof access_token === "string" &&
        access_token.length > 0
      ) {
        AccessTokenDeamon.update(access_token);
        return access_token;
      }

      AccessTokenDeamon.update(null);
      return request.ok ? 500 : request.status;
    } catch (error) {
      console.error("Failed to renew access token:", error);
      AccessTokenDeamon.update(null);
      return 500;
    } finally {
      clearTimeout(timeoutId);
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
  const pathname = usePathname();
  const isPublicRoute = useIsPublicRoute();
  const [access_token, setAccessToken] = useState<string | null>(null);
  const [expires_at, setExpiresAt] = useState<number>(0);
  const [errorCode, setErrorCode] = useState<number | null>(null);
  const [checkedPathname, setCheckedPathname] = useState<string | null>(null);
  const isLoading = !isPublicRoute && checkedPathname !== pathname;

  // Keep React state synchronized with daemon renewals for the provider lifetime.
  useEffect(() => {
    let isMounted = true;
    const unsubscribe = AccessTokenDeamon.subscribe((tokenState) => {
      if (!isMounted) return;
      setAccessToken(tokenState.access_token);
      setExpiresAt(tokenState.expires_at);
    });

    AccessTokenDeamon.start(renewAccessToken);

    return () => {
      isMounted = false;
      unsubscribe();
      AccessTokenDeamon.stop();
    };
  }, []);

  // Re-check authentication whenever navigation enters a protected route.
  useEffect(() => {
    if (isPublicRoute) {
      const resetId = setTimeout(() => setCheckedPathname(null), 0);
      return () => clearTimeout(resetId);
    }

    if (!pathname) {
      return;
    }

    let isCurrentCheck = true;

    (async () => {
      try {
        const tokenResult = await renewAccessToken();
        if (!isCurrentCheck) return;

        if (typeof tokenResult === "number") {
          setErrorCode(tokenResult);
        } else {
          setErrorCode(null);
        }
      } finally {
        if (isCurrentCheck) {
          setCheckedPathname(pathname);
        }
      }
    })();

    return () => {
      isCurrentCheck = false;
    };
  }, [isPublicRoute, pathname]);

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

  return React.createElement(
    AuthContext.Provider,
    {
      value: { access_token, expires_at, isLoading },
    },
    child_to_render,
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
