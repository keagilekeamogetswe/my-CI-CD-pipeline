import {
  useState,
  useMemo,
  useEffect,
  useRef,
  type CSSProperties,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
export function ChatsListView() {
  const router = useRouter();
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

  return (
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
          onClick={() => {
            router.push("/profile/");
          }}
          aria-label="Start a new chat"
          className="grid size-10 cursor-pointer touch-manipulation place-items-center rounded-full bg-neutral-900 text-white shadow-sm transition-all duration-200 hover:bg-neutral-800 hover:scale-105 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
        >
          <svg
            className="size-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
            />
          </svg>
        </button>
      </div>

      <div className="space-y-1 px-3 py-3">
        {filteredConversations.length ? (
          filteredConversations.map((conversation, index) => {
            const user_id = conversation.id;
            return (
              <button
                key={conversation.id}
                onClick={() => router.push(`/chats/message/${user_id}/`)}
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
                  user_id={`${user_id}`}
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
            );
          })
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
  );
}
