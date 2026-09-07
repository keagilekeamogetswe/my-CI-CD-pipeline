"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Avatar } from "./components/avatar";
import { Icon } from "./icon.repository";

export default function Header() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedQuery = query.trim();
    const search = normalizedQuery
      ? `?query=${encodeURIComponent(normalizedQuery)}`
      : "";
    router.replace(`/chats${search}`);
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
      <button
        type="button"
        aria-label="Open chats"
        onClick={() => router.replace("/chats")}
        className="grid size-10 touch-manipulation place-items-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-indigo-600 md:hidden"
      >
        <Icon name="menu" />
      </button>

      <button
        type="button"
        onClick={() => router.replace("/chats")}
        className="mr-auto flex touch-manipulation items-center gap-2 font-black tracking-tight text-slate-950 focus-visible:outline-2 focus-visible:outline-indigo-600 md:hidden"
      >
        <span className="grid size-8 place-items-center rounded-xl bg-indigo-600 text-sm text-white">
          C
        </span>
        Circle
      </button>

      <form
        role="search"
        className="mx-auto hidden w-full max-w-xl sm:block"
        onSubmit={submitSearch}
      >
        <label htmlFor="global-search" className="sr-only">
          Search chats and communities
        </label>
        <div className="flex items-center rounded-full border border-slate-200 bg-slate-50 px-4 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
          <Icon name="search" className="size-4 text-slate-400" />
          <input
            id="global-search"
            name="query"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search chats, people, and communities…"
            autoComplete="off"
            className="h-10 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-slate-400"
          />
          <kbd className="hidden rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-sans text-[10px] text-slate-400 lg:block">
            Ctrl K
          </kbd>
        </div>
      </form>

      <button
        type="button"
        aria-label="Open search"
        onClick={() => router.replace("/chats")}
        className="grid size-10 touch-manipulation place-items-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-indigo-600 sm:hidden"
      >
        <Icon name="search" />
      </button>

      <button
        type="button"
        aria-label="View notifications"
        onClick={() => router.replace("/notifications")}
        className="relative hidden size-10 touch-manipulation place-items-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-indigo-600 sm:grid"
      >
        <Icon name="notifications" />
        <span className="absolute right-2 top-2 size-2 rounded-full border-2 border-white bg-rose-500" />
      </button>

      <details className="group relative">
        <summary className="flex cursor-pointer list-none touch-manipulation items-center gap-2 rounded-full p-1 pr-2 transition-colors hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-indigo-600 [&::-webkit-details-marker]:hidden">
          <Avatar initials="KM" color="bg-slate-900" size="size-9" />
          <span className="hidden text-left lg:block">
            <strong className="block max-w-28 truncate text-xs text-slate-900">
              Keagile
            </strong>
            <span className="block text-[10px] text-slate-500">
              Personal Account
            </span>
          </span>
          <Icon
            name="chevron"
            className="hidden size-3 text-slate-400 transition-transform group-open:rotate-90 lg:block"
          />
        </summary>
        <div className="absolute right-0 top-12 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-200/70">
          <div className="border-b border-slate-100 px-3 py-3">
            <p className="truncate text-sm font-bold text-slate-950">
              Keagile Keamogetswe
            </p>
            <p className="truncate text-xs text-slate-500">
              keagile@example.com
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.replace("/account")}
            className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-indigo-700 focus-visible:outline-2 focus-visible:outline-indigo-600"
          >
            <Icon name="settings" className="size-4" />
            Account Settings
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-rose-500"
          >
            <Icon name="sign-out" className="size-4" />
            Sign Out
          </button>
        </div>
      </details>
    </header>
  );
}
