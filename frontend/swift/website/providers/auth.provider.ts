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
  const [access_token, setAccessToken] = useState<string | null>(null);

  // Keep React state synchronized with daemon renewals for the provider lifetime.
  const [isLoading, setIsLoading] = useState(true);
  const isInitialized = useRef(false);
  const redirected_start = useRef(false);

  useEffect(() => {
    if (isInitialized.current) {
      return;
    }
    AccessTokenDeamon.subscribe(setAccessToken);
    AccessTokenDeamon.start();
    isInitialized.current = true;
    setIsLoading(true);

    return () => {
      // AccessTokenDeamon.unsubscribe(setAccessToken);
      console.log("Unsubscriibing");
    };
  }, []);

  // Only runs when loading state changes
  useEffect(() => {
    console.log(access_token);
    if (access_token) {
      redirected_start.current = false;
      setIsLoading(false);
    } else {
      if (!redirected_start.current) {
        redirected_start.current = true;
      }
    }
  }, [access_token]);

  if (isLoading) return React.createElement(LoadingSplashScreen);
  if (redirected_start.current) {
    // Only updates the url, this does not cause any component render
    window.history.pushState(null, "", "/start");
    return React.createElement(StartPage);
  }

  return children;
}
