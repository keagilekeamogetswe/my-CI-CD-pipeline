"use client";
import {
  useState,
  useMemo,
  useEffect,
  useRef,
  type CSSProperties,
} from "react";
import { useSearchParams } from "next/navigation";
import { Avatar } from "../components/avatar";
import { Icon } from "../icon.repository";
import { ChatsListView } from "./chats.view";
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
export default function ChatsView({ children }: { children: React.ReactNode }) {
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
      <ChatsListView />

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

      {children}
    </div>
  );
}
