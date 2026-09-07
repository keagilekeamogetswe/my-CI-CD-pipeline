"use client";

import { usePathname, useRouter } from "next/navigation";
import { Icon } from "./icon.repository";
import {
  getViewPath,
  navItems,
  type ViewName,
} from "./(views)/view.register";

function useViewNavigation() {
  const pathname = usePathname();
  const router = useRouter();

  const navigateToView = (view: ViewName) => {
    const nextPath = getViewPath(view);
    if (pathname !== nextPath) {
      router.replace(nextPath);
    }
  };

  return { pathname, navigateToView };
}

export function DesktopNavigation() {
  const { pathname, navigateToView } = useViewNavigation();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[88px] flex-col items-center border-r border-slate-200 bg-white py-4 md:flex">
      <button
        type="button"
        aria-label="Open chats"
        onClick={() => navigateToView("chats")}
        className="grid size-11 touch-manipulation place-items-center rounded-2xl bg-indigo-600 text-lg font-black text-white shadow-lg shadow-indigo-200 transition-colors hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      >
        C
      </button>

      <nav aria-label="Primary navigation" className="mt-10 w-full px-2">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === getViewPath(item.id);

            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => navigateToView(item.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={`group relative flex min-h-16 w-full touch-manipulation flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600 ${
                    isActive
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-950"
                  }`}
                >
                  <Icon name={item.id} className="size-5" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="absolute right-3 top-2.5 grid min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] leading-4 text-white">
                      {item.badge}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

export function MobileNavigation() {
  const { pathname, navigateToView } = useViewNavigation();

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-[env(safe-area-inset-left)] pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="grid grid-cols-4">
        {navItems.map((item) => {
          const isActive = pathname === getViewPath(item.id);

          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => navigateToView(item.id)}
                aria-current={isActive ? "page" : undefined}
                className={`relative flex min-h-16 w-full touch-manipulation flex-col items-center justify-center gap-1 text-[10px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-indigo-600 ${
                  isActive
                    ? "text-indigo-700"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon name={item.id} className="size-5" />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="absolute left-1/2 top-1 ml-1 grid min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] leading-4 text-white">
                    {item.badge}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
