"use client";

import Image from "next/image";
import { useState } from "react";

export interface EventExperience {
  id: string;
  eventTitle: string;
  eventId: string;
  eventDate: string;
  userThoughts: string;
  photos: string[];
  taggedHost?: string;
  createdAt: string;
}

interface EventExperiencesProps {
  experiences?: EventExperience[];
  onShareExperience?: () => void;
}

const DEFAULT_EXPERIENCES: EventExperience[] = [
  {
    id: "exp-1",
    eventTitle: "AI Infrastructure Summit 2026",
    eventId: "evt-1",
    eventDate: "Oct 12, 2026",
    taggedHost: "Sandton Tech Collective",
    userThoughts:
      "Incredible keynote on distributed model training! Met amazing engineers and got inspired to refactor our queue daemon workers.",
    photos: [
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=800&q=80",
    ],
    createdAt: "2 days ago",
  },
  {
    id: "exp-2",
    eventTitle: "Next.js & Frontend Meetup",
    eventId: "evt-2",
    eventDate: "Nov 04, 2026",
    taggedHost: "Dev Community SA",
    userThoughts:
      "Loved the deep dive into Server Actions and edge middleware optimizations. Fantastic networking session afterwards!",
    photos: [
      "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=800&q=80",
    ],
    createdAt: "1 week ago",
  },
];

export default function EventExperiencesSection({
  experiences = DEFAULT_EXPERIENCES,
  onShareExperience,
}: EventExperiencesProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  return (
    <div className="w-full max-w-lg mx-auto mt-6">
      {/* Floating Rounded Rectangle Container */}
      <div className="bg-white/90 backdrop-blur-md border border-neutral-200/70 rounded-3xl p-6 sm:p-7 shadow-[0_16px_50px_-12px_rgba(0,0,0,0.06)] transition-all">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="space-y-0.5">
            <h2 className="text-base font-semibold tracking-tight text-neutral-900">
              Event Experiences
            </h2>
            <p className="text-xs text-neutral-400">
              Personal reflections and photos tagged to events
            </p>
          </div>

          <button
            type="button"
            onClick={onShareExperience}
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
            <span>Share Story</span>
          </button>
        </div>

        {/* Experience Posts Feed */}
        <div className="space-y-4">
          {experiences.length > 0 ? (
            experiences.map((exp) => (
              <div
                key={exp.id}
                className="p-4 rounded-2xl border border-neutral-100 hover:border-neutral-200/80 bg-neutral-50/40 transition-all space-y-3"
              >
                {/* Event Source Tag Header */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {/* Event Tag Pill */}
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-900 text-white text-[10px] font-medium max-w-full">
                      <svg
                        className="w-3 h-3 text-sky-400 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 6h.008v.008H6V6z"
                        />
                      </svg>
                      <span className="truncate">{exp.eventTitle}</span>
                    </div>

                    {exp.taggedHost && (
                      <span className="text-[10px] text-neutral-400 hidden sm:inline truncate">
                        by {exp.taggedHost}
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] text-neutral-400 shrink-0">
                    {exp.createdAt}
                  </span>
                </div>

                {/* Reflection / Thoughts */}
                <p className="text-xs text-neutral-700 leading-relaxed italic">
                  "{exp.userThoughts}"
                </p>

                {/* Photos Grid */}
                {exp.photos.length > 0 && (
                  <div
                    className={`grid gap-2 ${
                      exp.photos.length === 1 ? "grid-cols-1" : "grid-cols-2"
                    }`}
                  >
                    {exp.photos.map((photoUrl, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedPhoto(photoUrl)}
                        className="relative h-32 rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200/60 cursor-pointer group"
                      >
                        <Image
                          src={photoUrl}
                          alt={`Experience photo ${idx + 1}`}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          unoptimized
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="py-8 text-center rounded-2xl border border-dashed border-neutral-200">
              <p className="text-xs text-neutral-400 font-medium">
                No event experiences shared yet.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* High-Res Photo Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden shadow-2xl p-4 text-white">
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                className="w-7 h-7 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-black">
              <Image
                src={selectedPhoto}
                alt="Enlarged experience memory"
                fill
                className="object-contain"
                unoptimized
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
