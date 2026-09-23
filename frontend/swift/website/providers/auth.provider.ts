"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { LoadingSplashScreen } from "@/app/splash";
import StartPage from "@/app/(entry)/start/page";
import { AccessTokenDeamon } from "@/providers/access-token.deamon";

// Determines if the current path allows unauthenticated access (e.g., login or onboarding).
export function useIsPublicRoute() {
  const pathname = usePathname();
  return Boolean(
    pathname &&
    (pathname.startsWith("/account") || pathname.startsWith("/start")),
  );
}

// Global promise cache to deduplicate concurrent token renewal requests.

export default function AuthMiddleware({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isPublicRoute = useIsPublicRoute();
  const [access_token, setAccessToken] = useState<string | null | undefined>(
    undefined,
  );

  // Keep React state synchronized with daemon renewals for the provider lifetime.
  const [isLoading, setIsLoading] = useState(true);
  const isInitialized = useRef(false);
  const redirected_start = useRef(false);
  const [unauthorised, setUnauthorised] = useState<boolean | null>(null);

  useEffect(() => {
    if (isInitialized.current) {
      return;
    }
    setIsLoading(true);
  }, []);

  useEffect(() => {
    AccessTokenDeamon.subscribe(setAccessToken);
    AccessTokenDeamon.start();
    AccessTokenDeamon.setUnauthorizedCallback(setUnauthorised);
    isInitialized.current = true;
    return () => {
      AccessTokenDeamon.unsubscribe(setAccessToken);
    };
  });
  useEffect(() => {
    // Do not set loading if navigating to a public route
    if (pathname.match(/\/start/)) {
      setIsLoading(false);
      return;
    }

    // Only trigger loading if we truly do not have a token decision yet
    if (!access_token) {
      setIsLoading(true);
    }
  }, [pathname, access_token, unauthorised]);
  useEffect(() => {
    if (unauthorised) {
      console.log("User is unauthorized");
      setIsLoading(false);
      AccessTokenDeamon.stop();
    } else {
      if (unauthorised == false) setIsLoading(false);
      redirected_start.current = false;
      AccessTokenDeamon.start();
    }
  }, [unauthorised]);

  // Only runs when loading state changes
  useEffect(() => {
    if (access_token) {
      redirected_start.current = false;
      setIsLoading(false);
    } else {
      redirected_start.current = true;
    }
  }, [access_token]);

  if (isPublicRoute) {
    return children;
  }
  if (isLoading) return React.createElement(LoadingSplashScreen);
  if (redirected_start.current) {
    // Only updates the url, this does not cause any component render
    // window.history.replaceState(null, "", "/start");
    return React.createElement(StartPage);
  }

  return children;
}
