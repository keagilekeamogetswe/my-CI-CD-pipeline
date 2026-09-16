"use client";

import {
  useState,
  useMemo,
  useEffect,
  useRef,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Avatar } from "../components/avatar";

const MIN_SIDEBAR_WIDTH = 240;
const MAX_SIDEBAR_WIDTH = 500;
const DEFAULT_SIDEBAR_WIDTH = 320;

export interface Conversation {
  id: number;
  name: string;
  preview: string;
  time: string;
  unread: number;
  avatarUrl: string;
  initials: string;
  color: string;
  isOnline?: boolean;
  isGroup?: boolean;
  isPinned?: boolean;
}

const conversations: Conversation[] = [
  {
    id: 1,
    name: "Design Crew",
    preview: "Maya: The new concepts are ready",
    time: "9:42 AM",
    unread: 3,
    avatarUrl:
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=200&q=80",
    initials: "DC",
    color: "bg-violet-500",
    isGroup: true,
    isPinned: true,
  },
  {
    id: 2,
    name: "Jordan Lee",
    preview: "That sounds perfect. See you then!",
    time: "8:16 AM",
    unread: 1,
    avatarUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
    initials: "JL",
    color: "bg-amber-500",
    isOnline: true,
  },
  {
    id: 3,
    name: "Product Team",
    preview: "You: I’ve shared the updated roadmap",
    time: "Yesterday",
    unread: 0,
    avatarUrl:
      "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=200&q=80",
    initials: "PT",
    color: "bg-sky-500",
    isGroup: true,
  },
  {
    id: 4,
    name: "Priya Shah",
    preview: "Can you send me the event link?",
    time: "Tue",
    unread: 0,
    avatarUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
    initials: "PS",
    color: "bg-rose-500",
    isOnline: true,
  },
  {
    id: 5,
    name: "Weekend Runners",
    preview: "Sam: Saturday at 7?",
    time: "Mon",
    unread: 0,
    avatarUrl:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80",
    initials: "WR",
    color: "bg-emerald-500",
    isGroup: true,
  },
];

interface ContextMenuState {
  x: number;
  y: number;
  conversation: Conversation;
}

interface ChatsListViewProps {
  activeChatId?: string | number;
  onSelectChat?: (id: number) => void;
}

export function ChatsListView({
  activeChatId,
  onSelectChat,
}: ChatsListViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("query") ?? "";

  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(DEFAULT_SIDEBAR_WIDTH);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const startSidebarResize = (clientX: number) => {
    resizeStartXRef.current = clientX;
    resizeStartWidthRef.current = sidebarWidth;
    setIsResizingSidebar(true);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(e.target as Node)
      ) {
        setContextMenu(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setContextMenu(null);
    };

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

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

    const stopResize = () => setIsResizingSidebar(false);

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
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return conversations;
    return conversations.filter((conversation) =>
      `${conversation.name} ${conversation.preview}`
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [query]);

  const handleContextMenu = (
    e: ReactMouseEvent<HTMLButtonElement>,
    conversation: Conversation,
  ) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      conversation,
    });
  };

  const sidebarStyle: CSSProperties = {
    width: `${sidebarWidth}px`,
  };

  return (
    <aside
      style={sidebarStyle}
      className="relative flex h-full flex-col min-h-0 border-r border-neutral-200/80 bg-white select-none shrink-0"
    >
      {/* Header */}
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
          onClick={() => router.push("/profile/")}
          aria-label="Start a new chat"
          className="grid size-10 cursor-pointer place-items-center rounded-full bg-neutral-900 text-white shadow-sm transition-all duration-200 hover:bg-neutral-800 active:scale-95"
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
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
        </button>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto divide-y divide-neutral-100/70">
        {filteredConversations.length ? (
          filteredConversations.map((conversation) => {
            const userId = conversation.id;
            const isSelected = String(userId) === String(activeChatId);

            return (
              <button
                key={conversation.id}
                onClick={() => {
                  setContextMenu(null);
                  if (onSelectChat) {
                    onSelectChat(userId);
                  } else {
                    router.push(`/chats/message/${userId}/`);
                  }
                }}
                onContextMenu={(e) => handleContextMenu(e, conversation)}
                type="button"
                className={`group relative flex w-full cursor-pointer items-center gap-3.5 px-5 py-3.5 text-left transition-all duration-150 ${
                  isSelected
                    ? "bg-neutral-100/80 border-l-2 border-neutral-900 pl-[18px]"
                    : "hover:bg-neutral-50/70 border-l-2 border-transparent"
                }`}
              >
                {/* Profile Picture Avatar */}
                <div className="relative shrink-0">
                  <Avatar
                    src={conversation.avatarUrl}
                    initials={conversation.initials}
                    color={conversation.color}
                    user_id={`${userId}`}
                    alt={conversation.name}
                    size="size-10"
                  />

                  {/* Online Status Badge */}
                  {conversation.isOnline && (
                    <span
                      aria-label="Online"
                      className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-500 ring-2 ring-white"
                    />
                  )}
                </div>

                {/* Conversation Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={`truncate text-xs ${
                          isSelected || conversation.unread > 0
                            ? "font-semibold text-neutral-900"
                            : "font-medium text-neutral-700"
                        }`}
                      >
                        {conversation.name}
                      </span>

                      {conversation.isGroup && (
                        <span className="shrink-0 text-[10px] text-neutral-400 font-normal">
                          (Group)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {conversation.isPinned && (
                        <svg
                          className="size-3 text-neutral-400"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M10.828 2.828a2 2 0 012.828 0l1.414 1.414a2 2 0 010 2.828l-1.414 1.414 2.121 5.303a1 1 0 01-.293 1.118l-1.5 1.5a1 1 0 01-1.414 0l-4.242-4.242-4.243 4.242a1 1 0 01-1.414-1.414l4.242-4.242-4.242-4.243a1 1 0 010-1.414l1.5-1.5a1 1 0 011.118-.293l5.303 2.121 1.414-1.414z" />
                        </svg>
                      )}
                      <span
                        className={`text-[10px] ${
                          isSelected
                            ? "font-medium text-neutral-600"
                            : "text-neutral-400"
                        }`}
                      >
                        {conversation.time}
                      </span>
                    </div>
                  </div>

                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p
                      className={`truncate text-xs ${
                        isSelected
                          ? "font-medium text-neutral-800"
                          : conversation.unread > 0
                            ? "font-medium text-neutral-900"
                            : "text-neutral-500"
                      }`}
                    >
                      {conversation.preview}
                    </p>

                    {conversation.unread > 0 && (
                      <span className="grid h-4 min-w-4 px-1.5 shrink-0 place-items-center rounded-full bg-neutral-900 text-[10px] font-semibold text-white">
                        {conversation.unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        ) : (
          <div className="px-5 py-12 text-center">
            <p className="text-xs font-semibold text-neutral-800">
              No chats found
            </p>
            <p className="mt-1 text-[11px] text-neutral-400">
              Try searching for another name or message content.
            </p>
          </div>
        )}
      </div>

      {/* Resize Handle */}
      <div
        onMouseDown={(e) => startSidebarResize(e.clientX)}
        className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-neutral-300 active:bg-neutral-400 transition-colors"
      />

      {/* Custom Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          className="fixed z-50 w-48 rounded-xl border border-neutral-200 bg-white/95 p-1.5 shadow-xl backdrop-blur-md text-xs font-medium text-neutral-700 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-2 py-1.5 border-b border-neutral-100 mb-1">
            <p className="font-semibold text-neutral-900 truncate">
              {contextMenu.conversation.name}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              console.log("Pin Chat:", contextMenu.conversation.id);
              setContextMenu(null);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-neutral-100 hover:text-neutral-900"
          >
            <span>
              {contextMenu.conversation.isPinned ? "Unpin Chat" : "Pin Chat"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              console.log("Mute Notifications:", contextMenu.conversation.id);
              setContextMenu(null);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-neutral-100 hover:text-neutral-900"
          >
            <span>Mute Notifications</span>
          </button>

          <button
            type="button"
            onClick={() => {
              console.log("Mark as Read:", contextMenu.conversation.id);
              setContextMenu(null);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-neutral-100 hover:text-neutral-900"
          >
            <span>Mark as Read</span>
          </button>

          <div className="my-1 border-t border-neutral-100" />

          <button
            type="button"
            onClick={() => {
              console.log("Delete Chat:", contextMenu.conversation.id);
              setContextMenu(null);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-rose-600 transition-colors hover:bg-rose-50"
          >
            <span>Delete Conversation</span>
          </button>
        </div>
      )}
    </aside>
  );
}
