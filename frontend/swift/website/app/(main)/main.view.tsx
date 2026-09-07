"use client";
import type { ReactNode } from "react";
import Header from "./header";
import { DesktopNavigation, MobileNavigation } from "./navigation";

export default function MainView({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh overflow-x-hidden bg-white text-slate-900">
      <a
        href="#main-content"
        className="fixed left-4 top-3 z-50 -translate-y-20 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-transform focus:translate-y-0"
      >
        Skip to Content
      </a>

      <DesktopNavigation />

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col md:pl-[88px]">
        <Header />
        <main id="main-content" className="flex min-h-0 flex-1 pb-16 md:pb-0">
          {children}
        </main>
      </div>

      <MobileNavigation />
    </div>
  );
}
