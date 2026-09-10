"use client";
import {
  useState,
  useMemo,
  useEffect,
  useRef,
  Suspense,
  type CSSProperties,
} from "react";
import { useSearchParams } from "next/navigation";
import { Avatar } from "../components/avatar";
import { Icon } from "../icon.repository";

const MIN_SIDEBAR_WIDTH = 240;
const MAX_SIDEBAR_WIDTH = 500;
const DEFAULT_SIDEBAR_WIDTH = 320;

const conversations = [
  {
    id: 1,
    name: "Design Crew",
    preview: "Maya: The new concepts are ready",
    time: "9:42 AM",
    unread: 3,
    color: "bg-violet-500",
    initials: "DC",
  },
  {
    id: 2,
    name: "Jordan Lee",
    preview: "That sounds perfect. See you then!",
    time: "8:16 AM",
    unread: 1,
    color: "bg-amber-500",
    initials: "JL",
  },
  {
    id: 3,
    name: "Product Team",
    preview: "You: I’ve shared the updated roadmap",
    time: "Yesterday",
    unread: 0,
    color: "bg-sky-500",
    initials: "PT",
  },
  {
    id: 4,
    name: "Priya Shah",
    preview: "Can you send me the event link?",
    time: "Tue",
    unread: 0,
    color: "bg-rose-500",
    initials: "PS",
  },
  {
    id: 5,
    name: "Weekend Runners",
    preview: "Sam: Saturday at 7?",
    time: "Mon",
    unread: 0,
    color: "bg-emerald-500",
    initials: "WR",
  },
];

export default function ChatsPage() {
  return (
    <Suspense fallback={<div className="flex-1 bg-neutral-50/50" />}>
      <ChatsView />
    </Suspense>
  );
}

function ChatsView() {
  const searchParams = useSearchParams();
  const query = searchParams.get("query") ?? "";
  const [message, setMessage] = useState("");
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(DEFAULT_SIDEBAR_WIDTH);

  const startSidebarResize = (clientX: number) => {
    resizeStartXRef.current = clientX;
    resizeStartWidthRef.current = sidebarWidth;
    setIsResizingSidebar(true);
  };

  useEffect(() => {
    if (!isResizingSidebar) return;

    const handleMouseMove = (event: MouseEvent) => {
      const nextWidth =
        resizeStartWidthRef.current + (event.clientX - resizeStartXRef.current);
      const clampedWidth = Math.min(
        MAX_SIDEBAR_WIDTH,
        Math.max(MIN_SIDEBAR_WIDTH, nextWidth),
      );
      setSidebarWidth(clampedWidth);
    };

    const stopResize = () => {
      setIsResizingSidebar(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopResize);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopResize);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizingSidebar]);

  const filteredConversations = useMemo(() => {
    const normalizedQuery = (query ?? "").trim().toLowerCase();
    if (!normalizedQuery) return conversations;
    return conversations.filter((conversation) =>
      `${conversation.name} ${conversation.preview}`
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [query]);

  const layoutStyle = {
    "--sidebar-width": `${sidebarWidth}px`,
  } as CSSProperties;

  return (
    <div
      className="grid min-h-0 flex-1 md:grid-cols-[var(--sidebar-width)_12px_minmax(0,1fr)]"
      style={layoutStyle}
    >
      <aside className="min-h-0 border-r border-neutral-200/80 bg-white">
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">
              Messages
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">
              Your Chats
            </h1>
          </div>
          <button
            type="button"
            aria-label="Start a new chat"
            className="grid size-10 cursor-pointer touch-manipulation place-items-center rounded-full bg-neutral-900 text-white shadow-sm transition-all duration-200 hover:bg-neutral-800 hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
          >
            <svg
              className="size-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-1 px-3 py-3">
          {filteredConversations.length ? (
            filteredConversations.map((conversation, index) => (
              <button
                key={conversation.id}
                type="button"
                className={`flex w-full cursor-pointer touch-manipulation items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition-all duration-200 hover:bg-neutral-100/80 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-900 ${
                  index === 0 && !query
                    ? "bg-neutral-100 shadow-sm ring-1 ring-neutral-200/60"
                    : ""
                }`}
              >
                <Avatar
                  initials={conversation.initials}
                  color={conversation.color}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <strong className="truncate text-sm font-semibold text-neutral-900">
                      {conversation.name}
                    </strong>
                    <span className="shrink-0 text-[11px] text-neutral-400">
                      {conversation.time}
                    </span>
                  </span>
                  <span className="mt-1 flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-neutral-500">
                      {conversation.preview}
                    </span>
                    {conversation.unread > 0 && (
                      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-neutral-900 text-[10px] font-bold text-white">
                        {conversation.unread}
                      </span>
                    )}
                  </span>
                </span>
              </button>
            ))
          ) : (
            <div className="px-4 py-12 text-center">
              <p className="font-semibold text-neutral-900">No chats found</p>
              <p className="mt-1 text-sm text-neutral-500">
                Try searching for another name or message.
              </p>
            </div>
          )}
        </div>
      </aside>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize chat list"
        onMouseDown={(event) => {
          event.preventDefault();
          startSidebarResize(event.clientX);
        }}
        className={`group relative hidden w-3 cursor-col-resize touch-none transition-colors md:block ${
          isResizingSidebar ? "bg-neutral-100/80" : "hover:bg-neutral-100/80"
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 rounded-full transition-colors ${
            isResizingSidebar
              ? "bg-neutral-400"
              : "bg-transparent group-hover:bg-neutral-300"
          }`}
        />
      </div>

      <section className="hidden min-h-0 min-w-0 flex-col bg-neutral-50/50 md:flex">
        <header className="flex items-center justify-between border-b border-neutral-200/80 bg-white px-6 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar initials="DC" color="bg-violet-500" size="size-10" />
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-neutral-900">
                Design Crew
              </h2>
              <p className="flex items-center gap-1.5 text-xs text-neutral-500">
                <span className="size-2 rounded-full bg-emerald-500" />6 members
                online
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Open conversation options"
            className="grid size-9 cursor-pointer touch-manipulation place-items-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-neutral-900"
          >
            <svg
              className="size-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z"
              />
            </svg>
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-8">
          <div className="mx-auto flex max-w-2xl flex-col gap-6">
            <p className="self-center rounded-full bg-neutral-200/70 px-3 py-1 text-[11px] font-medium text-neutral-600">
              Today
            </p>
            <div className="flex max-w-[78%] items-end gap-2.5">
              <Avatar initials="MC" color="bg-fuchsia-500" size="size-8" />
              <div>
                <p className="mb-1 text-xs font-medium text-neutral-500">
                  Maya Chen · 9:36 AM
                </p>
                <p className="rounded-2xl rounded-bl-md bg-white px-4 py-3 text-sm leading-6 text-neutral-700 shadow-sm ring-1 ring-neutral-200/80">
                  Morning team! The new community dashboard concepts are ready
                  for review.
                </p>
              </div>
            </div>
            <div className="flex max-w-[78%] items-end gap-2.5">
              <Avatar initials="AL" color="bg-sky-500" size="size-8" />
              <div>
                <p className="mb-1 text-xs font-medium text-neutral-500">
                  Alex Lee · 9:39 AM
                </p>
                <p className="rounded-2xl rounded-bl-md bg-white px-4 py-3 text-sm leading-6 text-neutral-700 shadow-sm ring-1 ring-neutral-200/80">
                  Love the direction. The new navigation feels much clearer and
                  more focused.
                </p>
              </div>
            </div>
            <div className="max-w-[78%] self-end">
              <p className="rounded-2xl rounded-br-md bg-neutral-900 px-4 py-3 text-sm leading-6 text-white shadow-sm">
                Great work! I’ll review the interaction details and leave
                feedback before our afternoon sync.
              </p>
              <p className="mt-1 text-right text-[11px] text-neutral-400">
                9:41 AM · Read
              </p>
            </div>
          </div>
        </div>

        <form
          className="border-t border-neutral-200/80 bg-white p-4"
          onSubmit={(event) => {
            event.preventDefault();
            setMessage("");
          }}
        >
          <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-neutral-200 bg-neutral-50/50 p-2 transition-all focus-within:border-neutral-900 focus-within:bg-white focus-within:ring-1 focus-within:ring-neutral-900">
            <label htmlFor="chat-message" className="sr-only">
              Message Design Crew
            </label>
            <textarea
              id="chat-message"
              name="message"
              rows={1}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Write a message…"
              autoComplete="off"
              className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-3 py-2 text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
            />
            <button
              type="submit"
              aria-label="Send message"
              disabled={!message.trim()}
              className="grid size-10 shrink-0 cursor-pointer touch-manipulation place-items-center rounded-xl bg-neutral-900 text-white shadow-sm transition-all hover:bg-neutral-800 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400 disabled:active:scale-100"
            >
              <Icon name="send" className="size-4" />
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
