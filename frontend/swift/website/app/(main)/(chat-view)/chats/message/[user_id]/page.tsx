"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Avatar } from "../../../../components/avatar";

interface Message {
  id: string;
  senderId: string; // 'current_user' or dynamic user_id
  text: string;
  timestamp: string;
  status?: "sent" | "delivered" | "read";
  attachments?: { type: "image" | "file"; url: string; name?: string }[];
}

// Mock database lookup by user_id
const mockUsers: Record<
  string,
  {
    name: string;
    avatarUrl: string;
    isOnline: boolean;
    initials: string;
    color: string;
  }
> = {
  "1": {
    name: "Design Crew",
    avatarUrl:
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=200&q=80",
    isOnline: true,
    initials: "DC",
    color: "bg-violet-500",
  },
  "2": {
    name: "Jordan Lee",
    avatarUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80",
    isOnline: true,
    initials: "JL",
    color: "bg-amber-500",
  },
};

const initialMessages: Message[] = [
  {
    id: "m1",
    senderId: "2",
    text: "Hey! Did you manage to check out the updated design system components?",
    timestamp: "10:14 AM",
  },
  {
    id: "m2",
    senderId: "current_user",
    text: "Yes! The layout looks super clean and the context menus feel really intuitive.",
    timestamp: "10:16 AM",
    status: "read",
  },
  {
    id: "m3",
    senderId: "2",
    text: "Awesome! Let's sync up later today to finalize the rest.",
    timestamp: "10:18 AM",
  },
];

export default function MessagePage() {
  const params = useParams();
  const router = useRouter();
  const userId = (params.user_id as string) ?? "2";

  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentUser = mockUsers[userId] || {
    name: `User ${userId}`,
    avatarUrl: "",
    isOnline: false,
    initials: "U",
    color: "bg-neutral-600",
  };

  // Auto-scroll to bottom when new messages are added
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      senderId: "current_user",
      text: inputText.trim(),
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: "sent",
    };

    setMessages((prev) => [...prev, newMessage]);
    setInputText("");
  };

  return (
    <div className="flex h-full w-full flex-col bg-neutral-50/50">
      {/* 1. Header */}
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-neutral-200/80 bg-white px-5 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={() => router.push("/chats/")}
            className="grid size-8 place-items-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 md:hidden"
            aria-label="Back to chats"
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
                d="M15.75 19.5L8.25 12l7.5-7.5"
              />
            </svg>
          </button>

          <div className="relative shrink-0">
            <Avatar
              src={currentUser.avatarUrl}
              initials={currentUser.initials}
              color={currentUser.color}
              user_id={userId}
              size="size-9"
            />
            {currentUser.isOnline && (
              <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
            )}
          </div>

          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-neutral-900">
              {currentUser.name}
            </h2>
            <p className="text-[11px] text-neutral-500">
              {currentUser.isOnline ? "Active now" : "Offline"}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="grid size-8 place-items-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            aria-label="Search chat"
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
                d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              />
            </svg>
          </button>
          <button
            type="button"
            className="grid size-8 place-items-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            aria-label="More options"
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
                d="M12 6.75a0.75 0.75 0 1 1 0-1.5 0.75 0.75 0 0 1 0 1.5ZM12 12.75a0.75 0.75 0 1 1 0-1.5 0.75 0.75 0 0 1 0 1.5ZM12 18.75a0.75 0.75 0 1 1 0-1.5 0.75 0.75 0 0 1 0 1.5Z"
              />
            </svg>
          </button>
        </div>
      </header>

      {/* 2. Messages List */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {messages.map((msg) => {
          const isMe = msg.senderId === "current_user";

          return (
            <div
              key={msg.id}
              className={`flex w-full ${isMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`flex max-w-[80%] items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}
              >
                {!isMe && (
                  <Avatar
                    src={currentUser.avatarUrl}
                    initials={currentUser.initials}
                    color={currentUser.color}
                    user_id={userId}
                    size="size-7"
                  />
                )}

                <div className="group relative">
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-xs ${
                      isMe
                        ? "rounded-br-xs bg-neutral-900 text-white"
                        : "rounded-bl-xs border border-neutral-200/80 bg-white text-neutral-800"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">
                      {msg.text}
                    </p>
                  </div>

                  {/* Message Timestamp & Status */}
                  <div
                    className={`mt-1 flex items-center gap-1 text-[10px] text-neutral-400 ${
                      isMe ? "justify-end" : "justify-start"
                    }`}
                  >
                    <span>{msg.timestamp}</span>
                    {isMe && (
                      <span className="text-neutral-500">
                        {msg.status === "read" ? "✓✓" : "✓"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* 3. Input Bar */}
      <div className="border-t border-neutral-200/80 bg-white p-3 md:px-5">
        <form
          onSubmit={handleSendMessage}
          className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50/50 p-1.5 focus-within:border-neutral-400 focus-within:bg-white transition-all"
        >
          {/* Attachment Button */}
          <button
            type="button"
            className="grid size-8 place-items-center rounded-lg text-neutral-400 transition-colors hover:text-neutral-700"
            aria-label="Attach file"
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
                d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13"
              />
            </svg>
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-transparent text-xs text-neutral-900 placeholder:text-neutral-400 focus:outline-hidden"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="grid size-8 cursor-pointer place-items-center rounded-lg bg-neutral-900 text-white transition-all hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400"
            aria-label="Send message"
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
                d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
              />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
