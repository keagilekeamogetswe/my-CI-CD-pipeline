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
  const [access_token_has_error, setAccessTokenHasError] = useState<
    true | false
  >(false);
  const [checkedPathname, setCheckedPathname] = useState<string | null>(null);
  const isLoading = !isPublicRoute && checkedPathname !== pathname;

  // Keep React state synchronized with daemon renewals for the provider lifetime.
  useEffect(() => {
    let isMounted = true;
    const unsubscribe = AccessTokenDeamon.subscribe((tokenState) => {
      if (!isMounted) return;
      AccessTokenDeamon.subscribe(setAccessToken);
    });

    AccessTokenDeamon.start();

    return () => {
      isMounted = false;
      AccessTokenDeamon.unsubscribe(setAccessToken);
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
        //The deamon should set the access token;
        if (!isCurrentCheck) return;

        if (access_token === null) {
          setAccessTokenHasError(true);
        } else {
          setAccessTokenHasError(false);
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
      const query = access_token_has_error ? `?redirected_with=401` : "";
      router.replace(`/start${query}`);
    }
  }, [isLoading, access_token, isPublicRoute, access_token_has_error, router]);

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
