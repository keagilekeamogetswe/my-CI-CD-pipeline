"use client";

import Image from "next/image";
import { useState } from "react";

export interface EventItem {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  coverUrl: string;
  category: "subscribed" | "reposted" | "upcoming";
  isUserCreated?: boolean;
  repostedBy?: string;
}

interface EventSectionProps {
  events?: EventItem[];
  onCreateEvent?: () => void;
}

const DEFAULT_EVENTS: EventItem[] = [
  {
    id: "evt-1",
    title: "AI Summit 2026",
    date: "Oct 12",
    time: "09:00 AM",
    location: "Sandton Convention Centre",
    coverUrl:
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80",
    category: "upcoming",
    isUserCreated: true,
  },
  {
    id: "evt-2",
    title: "Next.js Meetup",
    date: "Nov 04",
    time: "06:30 PM",
    location: "Rosebank Tech Hub",
    coverUrl:
      "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=800&q=80",
    category: "subscribed",
    isUserCreated: false,
  },
  {
    id: "evt-3",
    title: "Design System Conf",
    date: "Nov 20",
    time: "11:00 AM",
    location: "Cape Town ICC",
    coverUrl:
      "https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=800&q=80",
    category: "subscribed",
    isUserCreated: false,
  },
  {
    id: "evt-4",
    title: "Web3 Cloud Workshop",
    date: "Dec 01",
    time: "02:00 PM",
    location: "Online / Discord",
    coverUrl:
      "https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=800&q=80",
    category: "subscribed",
    isUserCreated: false,
  },
  {
    id: "evt-5",
    title: "Open Source Dev Conf",
    date: "Dec 18",
    time: "10:00 AM",
    location: "Cape Town ICC",
    coverUrl:
      "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=800&q=80",
    category: "reposted",
    isUserCreated: false,
    repostedBy: "Alex Chen",
  },
];

type FilterType = "all" | "mine" | "subscribed" | "reposted";

export default function EventSection({
  events = DEFAULT_EVENTS,
  onCreateEvent,
}: EventSectionProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  // Filter events based on the active chip
  const filteredEvents = events.filter((evt) => {
    if (activeFilter === "mine") return evt.isUserCreated;
    if (activeFilter === "subscribed") return evt.category === "subscribed";
    if (activeFilter === "reposted") return evt.category === "reposted";
    return true; // "all"
  });

  const filterChips: { label: string; value: FilterType }[] = [
    { label: "All Events", value: "all" },
    { label: "Your Events", value: "mine" },
    { label: "Subscribed", value: "subscribed" },
    { label: "Reposted", value: "reposted" },
  ];

  return (
    <div className="w-full py-4">
      {/* Floating Card Container */}
      <div className="bg-white/80 backdrop-blur-xl border border-neutral-200/60 rounded-3xl p-5 sm:p-6 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] transition-all">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="space-y-0.5">
            <h2 className="text-sm font-semibold tracking-tight text-neutral-900">
              Upcoming Events
            </h2>
            <p className="text-[11px] text-neutral-400">
              Stories & quick access
            </p>
          </div>

          <button
            type="button"
            onClick={onCreateEvent}
            className="h-8 px-3 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-[11px] font-medium transition-all shadow-xs flex items-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <svg
              className="w-3 h-3 stroke-[2.5]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4.5v15m7.5-7.5h-15"
              />
            </svg>
            <span>Host</span>
          </button>
        </div>

        {/* Filter Keyword Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-3 scrollbar-none snap-x">
          {filterChips.map((chip) => {
            const isActive = activeFilter === chip.value;
            return (
              <button
                key={chip.value}
                type="button"
                onClick={() => setActiveFilter(chip.value)}
                className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all shrink-0 cursor-pointer snap-start ${
                  isActive
                    ? "bg-neutral-900 text-white shadow-xs"
                    : "bg-neutral-100/80 text-neutral-500 hover:bg-neutral-200/60 hover:text-neutral-800"
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* Event Story Rings Horizontal Tray */}
        <div className="flex items-center gap-3.5 overflow-x-auto pt-1 pb-1 scrollbar-none snap-x -mx-1 px-1">
          {/* Create Trigger Ring */}
          <button
            type="button"
            onClick={onCreateEvent}
            className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer snap-start"
          >
            <div className="relative w-14 h-14 rounded-full border border-dashed border-neutral-300 group-hover:border-neutral-900 flex items-center justify-center bg-neutral-50/50 transition-all">
              <svg
                className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900 transition-colors"
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
            </div>
            <span className="text-[10px] text-neutral-500 font-normal">
              New
            </span>
          </button>

          {/* Render Filtered Event Rings */}
          {filteredEvents.length > 0 ? (
            filteredEvents.map((evt) => (
              <div
                key={evt.id}
                onClick={() => setSelectedEvent(evt)}
                className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer snap-start"
              >
                <div
                  className={`relative p-0.5 rounded-full transition-transform duration-200 group-hover:scale-105 ${
                    evt.isUserCreated
                      ? "ring-1.5 ring-neutral-900"
                      : "ring-1.5 ring-neutral-300"
                  }`}
                >
                  <div className="relative w-13 h-13 rounded-full overflow-hidden bg-neutral-100">
                    <Image
                      src={evt.coverUrl}
                      alt={evt.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                </div>

                <span className="text-[10px] font-medium text-neutral-700 truncate max-w-[56px] text-center">
                  {evt.title}
                </span>
              </div>
            ))
          ) : (
            <div className="flex items-center justify-center h-14 px-4">
              <span className="text-[11px] text-neutral-400">
                No events found
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-xs bg-white border border-neutral-100 rounded-3xl overflow-hidden shadow-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">
                {selectedEvent.isUserCreated ? "Hosting" : "Attending"}
              </span>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="w-6 h-6 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 flex items-center justify-center cursor-pointer text-xs transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="relative aspect-video w-full rounded-2xl overflow-hidden mb-3 bg-neutral-100">
              <Image
                src={selectedEvent.coverUrl}
                alt={selectedEvent.title}
                fill
                className="object-cover"
                unoptimized
              />
            </div>

            <h3 className="text-sm font-semibold text-neutral-900 mb-0.5">
              {selectedEvent.title}
            </h3>
            <p className="text-[11px] text-neutral-400 mb-3">
              {selectedEvent.date} at {selectedEvent.time}
            </p>

            <div className="text-[11px] text-neutral-600 bg-neutral-50 p-2.5 rounded-xl mb-4 border border-neutral-100/80">
              📍 {selectedEvent.location}
            </div>

            <button
              type="button"
              onClick={() => setSelectedEvent(null)}
              className="w-full py-2 bg-neutral-900 text-white font-medium text-xs rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
