"use client";

import Image from "next/image";
import { useState } from "react";

export interface HighlightItem {
  id: string;
  type: "image" | "video";
  url: string;
}

export interface ActivityHighlight {
  id: string;
  title: string;
  date: string;
  location?: string;
  coverUrl: string;
  media: HighlightItem[]; // Max 15 items
}

interface ActivityGalleryProps {
  activities?: ActivityHighlight[];
  maxActivities?: number; // Default 10
  onAddActivity?: () => void;
}

const DEFAULT_ACTIVITIES: ActivityHighlight[] = [
  {
    id: "act-1",
    title: "Summer Hackathon",
    date: "Aug 2026",
    location: "Cape Town",
    coverUrl:
      "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80",
    media: [
      {
        id: "m-1",
        type: "image",
        url: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80",
      },
      {
        id: "m-2",
        type: "image",
        url: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80",
      },
    ],
  },
  {
    id: "act-2",
    title: "Product Launch",
    date: "Jul 2026",
    location: "Johannesburg",
    coverUrl:
      "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=800&q=80",
    media: [
      {
        id: "m-3",
        type: "image",
        url: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=800&q=80",
      },
    ],
  },
  {
    id: "act-3",
    title: "Mountain Retreat",
    date: "May 2026",
    location: "Drakensberg",
    coverUrl:
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80",
    media: [
      {
        id: "m-4",
        type: "image",
        url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=800&q=80",
      },
    ],
  },
];

const MAX_ACTIVITIES_LIMIT = 10;
const MAX_MEDIA_PER_ACTIVITY = 15;

export default function ActivityGallery({
  activities = DEFAULT_ACTIVITIES,
  maxActivities = MAX_ACTIVITIES_LIMIT,
  onAddActivity,
}: ActivityGalleryProps) {
  const [selectedActivity, setSelectedActivity] =
    useState<ActivityHighlight | null>(null);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  const canAddMore = activities.length < maxActivities;

  const openActivityModal = (activity: ActivityHighlight) => {
    setSelectedActivity(activity);
    setActiveMediaIndex(0);
  };

  return (
    <div className="w-full pt-4 pb-2 border-t border-neutral-100">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-3 px-0.5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
            Activity Gallery
          </span>
          <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 bg-neutral-100 text-neutral-500 rounded-md border border-neutral-200/60">
            {activities.length}/{maxActivities}
          </span>
        </div>

        {canAddMore ? (
          <button
            type="button"
            onClick={onAddActivity}
            className="text-[11px] text-neutral-800 hover:text-neutral-500 font-medium transition-colors cursor-pointer flex items-center gap-1"
          >
            <svg
              className="w-3 h-3"
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
            <span>Add</span>
          </button>
        ) : (
          <span className="text-[10px] text-neutral-400 italic">
            Limit reached
          </span>
        )}
      </div>

      {/* Proportional Horizontal Scroll Track */}
      <div className="relative -mx-6 sm:-mx-8 px-6 sm:px-8">
        <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none snap-x snap-mandatory">
          {activities.map((act) => {
            const mediaCount = Math.min(
              act.media.length,
              MAX_MEDIA_PER_ACTIVITY,
            );

            return (
              <div
                key={act.id}
                onClick={() => openActivityModal(act)}
                className="group relative flex-none w-44 h-28 sm:w-48 sm:h-30 rounded-xl overflow-hidden border border-neutral-200/70 bg-neutral-900 cursor-pointer snap-start transition-all duration-200 hover:shadow-md hover:border-neutral-300"
              >
                {/* Background Media */}
                <Image
                  src={act.coverUrl}
                  alt={act.title}
                  fill
                  className="object-cover opacity-85 group-hover:scale-105 group-hover:opacity-95 transition-all duration-300"
                  unoptimized
                />

                {/* Subtle Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />

                {/* Media Counter Badge */}
                <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/40 backdrop-blur-md text-[9px] font-medium text-white border border-white/10">
                  <svg
                    className="w-2.5 h-2.5 text-white/80"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                    />
                  </svg>
                  <span>
                    {mediaCount}/{MAX_MEDIA_PER_ACTIVITY}
                  </span>
                </div>

                {/* Highlight Info */}
                <div className="absolute bottom-2 left-2.5 right-2.5 text-white">
                  <h3 className="text-xs font-medium truncate leading-snug">
                    {act.title}
                  </h3>
                  <p className="text-[10px] text-neutral-300/90 truncate mt-0.5">
                    {act.date} {act.location && `• ${act.location}`}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Proportional Add Button Card */}
          {canAddMore && (
            <button
              type="button"
              onClick={onAddActivity}
              className="flex-none w-28 h-28 sm:w-32 sm:h-30 rounded-xl border border-dashed border-neutral-200 hover:border-neutral-300 bg-neutral-50/60 hover:bg-neutral-50 transition-all flex flex-col items-center justify-center text-neutral-400 hover:text-neutral-700 cursor-pointer snap-start gap-1"
            >
              <div className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center">
                <svg
                  className="w-3.5 h-3.5"
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
              <span className="text-[11px] font-medium text-neutral-600">
                New Story
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Modal Detail Viewer */}
      {selectedActivity && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm sm:max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl text-white">
            <div className="flex items-center justify-between p-3.5 border-b border-neutral-800">
              <div>
                <h3 className="text-xs font-semibold">
                  {selectedActivity.title}
                </h3>
                <p className="text-[10px] text-neutral-400">
                  {selectedActivity.date}{" "}
                  {selectedActivity.location &&
                    `• ${selectedActivity.location}`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedActivity(null)}
                className="w-7 h-7 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <div className="relative aspect-square w-full bg-black flex items-center justify-center">
              {selectedActivity.media.length > 0 ? (
                <Image
                  src={selectedActivity.media[activeMediaIndex].url}
                  alt="Activity content"
                  fill
                  className="object-contain"
                  unoptimized
                />
              ) : (
                <span className="text-xs text-neutral-500">
                  No media uploaded
                </span>
              )}
            </div>

            <div className="p-3 flex items-center justify-between border-t border-neutral-800 text-[11px] text-neutral-400">
              <span>
                {activeMediaIndex + 1} of{" "}
                {Math.min(
                  selectedActivity.media.length,
                  MAX_MEDIA_PER_ACTIVITY,
                )}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={activeMediaIndex === 0}
                  onClick={() => setActiveMediaIndex((prev) => prev - 1)}
                  className="px-2.5 py-1 rounded-md bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={
                    activeMediaIndex >=
                    Math.min(
                      selectedActivity.media.length,
                      MAX_MEDIA_PER_ACTIVITY,
                    ) -
                      1
                  }
                  onClick={() => setActiveMediaIndex((prev) => prev + 1)}
                  className="px-2.5 py-1 rounded-md bg-neutral-800 hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
