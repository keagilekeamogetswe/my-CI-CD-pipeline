"use client";

import { useEffect, useState } from "react";

export function LoadingSplashScreen() {
  const [progress, setProgress] = useState(12);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 98) {
          clearInterval(timer);
          return 98;
        }
        const diff = Math.floor(Math.random() * 12) + 4;
        return Math.min(prev + diff, 98);
      });
    }, 280);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-neutral-50 px-6 py-10 sm:py-14 text-gray-900 select-none overflow-hidden font-sans">
      {/* Subtle top branding badge */}
      <header className="w-full flex items-center justify-between max-w-md mx-auto">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-medium tracking-widest uppercase text-gray-500">
            System Operational
          </span>
        </div>
        <div className="text-[11px] tracking-wider text-gray-400 font-mono">
          SECURE CONNECT
        </div>
      </header>

      {/* Center card styled like the entry component */}
      <main className="w-full max-w-md mx-auto my-auto p-8 md:p-10 border border-gray-200 bg-white shadow-sm rounded-2xl text-gray-900">
        <div className="mb-6 flex items-center justify-between">
          <div className="h-10 w-10 rounded-xl bg-black text-white flex items-center justify-center shadow-sm">
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
            {progress}%
          </span>
        </div>

        <div className="mb-6">
          <h1 className="text-xl font-semibold tracking-tight mb-1.5 text-gray-900">
            Swift Enterprise
          </h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            Initializing high-speed distributed infrastructure...
          </p>
        </div>

        {/* Dynamic Progress Indicator */}
        <div className="space-y-3">
          <div className="relative h-2 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-200/80">
            <div
              className="h-full bg-black rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="flex items-center gap-2">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
              Loading core modules
            </span>
            <span className="font-mono text-gray-400 text-[11px]">
              Please wait
            </span>
          </div>
        </div>
      </main>

      {/* Footer metadata */}
      <footer className="w-full max-w-md mx-auto flex items-center justify-between gap-3 text-[11px] text-gray-500 pt-5">
        <div className="flex items-center gap-2">
          <span>Enterprise Grade Security</span>
          <span className="h-1 w-1 rounded-full bg-gray-300" />
          <span>SSL Encrypted</span>
        </div>
        <div className="font-mono text-gray-400">v2.4.0</div>
      </footer>
    </div>
  );
}
