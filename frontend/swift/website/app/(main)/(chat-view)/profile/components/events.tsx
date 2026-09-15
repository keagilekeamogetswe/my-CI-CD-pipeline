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
  isUserCreated?: boolean; // Distinguishes host vs incoming subscribed
  repostedBy?: string;
}

interface EventSectionProps {
  events?: EventItem[];
  onCreateEvent?: () => void;
}

const DEFAULT_EVENTS: EventItem[] = [
  // Upcoming Events (Status Circles)
  {
    id: "evt-1",
    title: "AI Summit 2026",
    date: "Oct 12, 2026",
    time: "09:00 AM",
    location: "Sandton Convention Centre",
    coverUrl:
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80",
    category: "upcoming",
    isUserCreated: true, // User created
  },
  {
    id: "evt-2",
    title: "Next.js Meetup",
    date: "Nov 04, 2026",
    time: "06:30 PM",
    location: "Rosebank Tech Hub",
    coverUrl:
      "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=800&q=80",
    category: "upcoming",
    isUserCreated: false, // Incoming Subscribed
  },
  {
    id: "evt-3",
    title: "Design System Conf",
    date: "Nov 20, 2026",
    time: "11:00 AM",
    location: "Cape Town ICC",
    coverUrl:
      "https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=800&q=80",
    category: "upcoming",
    isUserCreated: false, // Incoming Subscribed
  },
  // Subscribed & Reposted
  {
    id: "evt-4",
    title: "Web3 Cloud Workshop",
    date: "Dec 01, 2026",
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
    date: "Dec 18, 2026",
    time: "10:00 AM",
    location: "Cape Town ICC",
    coverUrl:
      "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=800&q=80",
    category: "reposted",
    isUserCreated: false,
    repostedBy: "Alex Chen",
  },
];

export default function EventSection({
  events = DEFAULT_EVENTS,
  onCreateEvent,
}: EventSectionProps) {
  const [activeTab, setActiveTab] = useState<
    "upcoming" | "subscribed" | "reposted"
  >("upcoming");
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  const upcomingEvents = events.filter((evt) => evt.category === "upcoming");
  const listEvents = events.filter((evt) => evt.category === activeTab);

  return (
    <div className="w-full max-w-lg mx-auto mt-6">
      {/* Floating Rounded Rectangle Container */}
      <div className="bg-white/90 backdrop-blur-md border border-neutral-200/70 rounded-3xl p-6 sm:p-7 shadow-[0_16px_50px_-12px_rgba(0,0,0,0.06)] transition-all">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="space-y-0.5">
            <h2 className="text-base font-semibold tracking-tight text-neutral-900">
              Events
            </h2>
            <p className="text-xs text-neutral-400">
              Upcoming statuses, subscriptions, and shares
            </p>
          </div>

          <button
            type="button"
            onClick={onCreateEvent}
            className="h-8 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
          >
            <svg
              className="w-3.5 h-3.5"
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
            <span>Host Event</span>
          </button>
        </div>

        {/* Statuses Bar for Upcoming Events */}
        <div className="mb-6 pt-1 pb-3 border-b border-neutral-100">
          <div className="flex items-center justify-between mb-3 px-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Upcoming Statuses
            </span>
            <span className="text-[10px] text-neutral-400 italic">
              Tap to view details
            </span>
          </div>

          <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-none snap-x">
            {/* Create Event Status Ring Trigger */}
            <button
              type="button"
              onClick={onCreateEvent}
              className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer snap-start"
            >
              <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-full border-2 border-dashed border-neutral-300 group-hover:border-neutral-800 flex items-center justify-center bg-neutral-50 transition-colors">
                <svg
                  className="w-5 h-5 text-neutral-500 group-hover:text-neutral-900 transition-colors"
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
              <span className="text-[10px] font-medium text-neutral-600 truncate max-w-[68px]">
                Create
              </span>
            </button>

            {/* Status Rings List */}
            {upcomingEvents.map((evt) => (
              <div
                key={evt.id}
                onClick={() => setSelectedEvent(evt)}
                className="flex flex-col items-center gap-1.5 shrink-0 group cursor-pointer snap-start"
              >
                {/* Circle Ring Outer Wrapper */}
                <div
                  className={`relative p-0.5 rounded-full transition-transform duration-200 group-hover:scale-105 ${
                    evt.isUserCreated
                      ? "ring-2 ring-neutral-900 ring-offset-2" // User Created: Bold Dark Ring
                      : "ring-2 ring-sky-500 ring-offset-2 bg-gradient-to-tr from-sky-400 to-indigo-500 p-[2px]" // Subscribed Incoming: Gradient Ring
                  }`}
                >
                  <div className="relative w-15 h-15 sm:w-17 sm:h-17 rounded-full overflow-hidden bg-neutral-100 border border-white">
                    <Image
                      src={evt.coverUrl}
                      alt={evt.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>

                  {/* Distinction Badge */}
                  <span
                    className={`absolute -bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full border border-white shadow-xs ${
                      evt.isUserCreated
                        ? "bg-neutral-900 text-white"
                        : "bg-sky-500 text-white"
                    }`}
                  >
                    {evt.isUserCreated ? "Host" : "Attending"}
                  </span>
                </div>

                {/* Status Label */}
                <span className="text-[11px] font-medium text-neutral-800 truncate max-w-[72px] text-center mt-1">
                  {evt.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-100/70 rounded-2xl mb-4">
          <button
            type="button"
            onClick={() => setActiveTab("upcoming")}
            className={`flex-1 py-1.5 text-xs font-medium rounded-xl transition-all cursor-pointer ${
              activeTab === "upcoming"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("subscribed")}
            className={`flex-1 py-1.5 text-xs font-medium rounded-xl transition-all cursor-pointer ${
              activeTab === "subscribed"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            Subscribed
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("reposted")}
            className={`flex-1 py-1.5 text-xs font-medium rounded-xl transition-all cursor-pointer ${
              activeTab === "reposted"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500 hover:text-neutral-800"
            }`}
          >
            Reposts
          </button>
        </div>

        {/* Secondary Detailed List View */}
        <div className="space-y-2.5">
          {listEvents.length > 0 ? (
            listEvents.map((evt) => (
              <div
                key={evt.id}
                onClick={() => setSelectedEvent(evt)}
                className="group flex items-center gap-3 p-2 rounded-2xl border border-neutral-100 hover:border-neutral-200 bg-neutral-50/40 hover:bg-neutral-50 transition-all cursor-pointer"
              >
                <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-neutral-100 shrink-0">
                  <Image
                    src={evt.coverUrl}
                    alt={evt.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <h3 className="text-xs font-semibold text-neutral-900 truncate">
                      {evt.title}
                    </h3>
                    {evt.isUserCreated && (
                      <span className="text-[8px] font-bold uppercase px-1 py-0.2 rounded bg-neutral-900 text-white">
                        Host
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-neutral-500">
                    {evt.date} • {evt.time}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center py-4 text-xs text-neutral-400">
              No events found in this tab.
            </p>
          )}
        </div>
      </div>

      {/* Interactive Status Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl text-white p-5">
            <div className="flex items-center justify-between mb-4">
              <span
                className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  selectedEvent.isUserCreated
                    ? "bg-white text-neutral-900"
                    : "bg-sky-500 text-white"
                }`}
              >
                {selectedEvent.isUserCreated
                  ? "Hosted Event"
                  : "Attending Event"}
              </span>
              <button
                type="button"
                onClick={() => setSelectedEvent(null)}
                className="w-7 h-7 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <div className="relative aspect-video w-full rounded-2xl overflow-hidden mb-4 bg-neutral-800">
              <Image
                src={selectedEvent.coverUrl}
                alt={selectedEvent.title}
                fill
                className="object-cover"
                unoptimized
              />
            </div>

            <h3 className="text-base font-semibold mb-1">
              {selectedEvent.title}
            </h3>
            <p className="text-xs text-neutral-400 mb-3">
              {selectedEvent.date} at {selectedEvent.time}
            </p>
            <p className="text-xs text-neutral-300 bg-neutral-800/60 p-2.5 rounded-xl border border-neutral-800">
              📍 {selectedEvent.location}
            </p>

            <button
              type="button"
              onClick={() => setSelectedEvent(null)}
              className="w-full mt-4 py-2.5 bg-white text-neutral-900 font-medium text-xs rounded-xl hover:bg-neutral-100 transition-colors"
            >
              Close Status
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
