"use client";

import Image from "next/image";
import { useState } from "react";

export interface ExperiencePost {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  coverUrl: string;
  author: {
    name: string;
    avatarUrl: string;
    handle: string;
  };
  repostedBy?: {
    name: string;
    avatarUrl: string;
  };
  userNote?: string; // Personal caption added during repost
  isUserCreated?: boolean;
  category: "subscribed" | "reposted" | "mine";
  likesCount: number;
  repostsCount: number;
}

interface ExperienceFeedProps {
  posts?: ExperiencePost[];
  onCreateExperience?: () => void;
}

const DEFAULT_POSTS: ExperiencePost[] = [
  {
    id: "exp-1",
    title: "AI Summit 2026",
    date: "Oct 12",
    time: "09:00 AM",
    location: "Sandton Convention Centre",
    coverUrl:
      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80",
    author: {
      name: "Keamogetswe Keagile",
      avatarUrl:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80",
      handle: "@keamogetswe",
    },
    userNote:
      "Hosting the keynote stage this year! Excited to demonstrate full-stack AI integration patterns.",
    isUserCreated: true,
    category: "mine",
    likesCount: 34,
    repostsCount: 8,
  },
  {
    id: "exp-2",
    title: "Next.js Meetup",
    date: "Nov 04",
    time: "06:30 PM",
    location: "Rosebank Tech Hub",
    coverUrl:
      "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=800&q=80",
    author: {
      name: "Sarah Jenkins",
      avatarUrl:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
      handle: "@sarah_j",
    },
    repostedBy: {
      name: "Alex Chen",
      avatarUrl:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80",
    },
    userNote:
      "Definitely attending this session on Server Actions and client optimization.",
    isUserCreated: false,
    category: "reposted",
    likesCount: 19,
    repostsCount: 4,
  },
  {
    id: "exp-3",
    title: "Design System Conf",
    date: "Nov 20",
    time: "11:00 AM",
    location: "Cape Town ICC",
    coverUrl:
      "https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=800&q=80",
    author: {
      name: "Cape Town Tech Collective",
      avatarUrl:
        "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=150&q=80",
      handle: "@ct_tech",
    },
    userNote:
      "Subscribed to early access tickets. Anyone else heading down to Cape Town for this?",
    isUserCreated: false,
    category: "subscribed",
    likesCount: 52,
    repostsCount: 12,
  },
];

type FilterType = "all" | "mine" | "subscribed" | "reposted";

export default function ExperienceFeed({
  posts = DEFAULT_POSTS,
  onCreateExperience,
}: ExperienceFeedProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});

  const filteredPosts = posts.filter((post) => {
    if (activeFilter === "mine") return post.isUserCreated;
    if (activeFilter === "subscribed") return post.category === "subscribed";
    if (activeFilter === "reposted") return post.category === "reposted";
    return true;
  });

  const filterChips: { label: string; value: FilterType }[] = [
    { label: "All Experiences", value: "all" },
    { label: "Your Posts", value: "mine" },
    { label: "Subscribed", value: "subscribed" },
    { label: "Reposts", value: "reposted" },
  ];

  const toggleLike = (id: string) => {
    setLikedPosts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="w-full py-4 space-y-4">
      {/* Top Header & Filters */}
      <div className="bg-white/80 backdrop-blur-xl border border-neutral-200/60 rounded-3xl p-5 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-neutral-900">
              Experiences
            </h2>
            <p className="text-[11px] text-neutral-400">
              Personalized event posts & shares
            </p>
          </div>

          <button
            type="button"
            onClick={onCreateExperience}
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
            <span>Share Post</span>
          </button>
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none snap-x">
          {filterChips.map((chip) => (
            <button
              key={chip.value}
              type="button"
              onClick={() => setActiveFilter(chip.value)}
              className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all shrink-0 cursor-pointer snap-start ${
                activeFilter === chip.value
                  ? "bg-neutral-900 text-white shadow-xs"
                  : "bg-neutral-100/80 text-neutral-500 hover:bg-neutral-200/60 hover:text-neutral-800"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Experience Posts Feed */}
      <div className="space-y-3.5">
        {filteredPosts.length > 0 ? (
          filteredPosts.map((post) => {
            const isLiked = likedPosts[post.id];
            return (
              <article
                key={post.id}
                className="bg-white/80 backdrop-blur-xl border border-neutral-200/60 rounded-3xl p-4 sm:p-5 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.04)] transition-all"
              >
                {/* Repost Header Context */}
                {post.repostedBy && (
                  <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-medium mb-2.5 pl-1">
                    <svg
                      className="w-3 h-3 text-neutral-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M4.5 12c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3-3m-3 3l3 3m12-3l-3-3m3 3l-3 3"
                      />
                    </svg>
                    <span>{post.repostedBy.name} reposted</span>
                  </div>
                )}

                {/* Author Info */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="relative w-8 h-8 rounded-full overflow-hidden bg-neutral-100">
                      <Image
                        src={post.author.avatarUrl}
                        alt={post.author.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-xs font-semibold text-neutral-900 leading-tight">
                          {post.author.name}
                        </h3>
                        {post.isUserCreated && (
                          <span className="text-[9px] font-medium px-1.5 py-0.2 rounded-full bg-neutral-100 text-neutral-600">
                            Host
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-neutral-400">
                        {post.author.handle}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] text-neutral-400 font-medium">
                    {post.date}
                  </span>
                </div>

                {/* Personal Note / Post Caption */}
                {post.userNote && (
                  <p className="text-xs text-neutral-700 mb-3 leading-relaxed">
                    {post.userNote}
                  </p>
                )}

                {/* Event Card Attachment */}
                <div className="relative rounded-2xl overflow-hidden border border-neutral-200/50 bg-neutral-50 mb-3">
                  <div className="relative aspect-video w-full bg-neutral-100">
                    <Image
                      src={post.coverUrl}
                      alt={post.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    <div className="absolute top-2.5 right-2.5 bg-neutral-900/80 backdrop-blur-md text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
                      {post.date} • {post.time}
                    </div>
                  </div>

                  <div className="p-3">
                    <h4 className="text-xs font-semibold text-neutral-900 mb-0.5">
                      {post.title}
                    </h4>
                    <p className="text-[10px] text-neutral-500 flex items-center gap-1">
                      <span>📍</span> {post.location}
                    </p>
                  </div>
                </div>

                {/* Interactive Post Footer Bar */}
                <div className="flex items-center justify-between pt-1 text-[11px] text-neutral-500">
                  <div className="flex items-center gap-4">
                    {/* Like Action */}
                    <button
                      type="button"
                      onClick={() => toggleLike(post.id)}
                      className={`flex items-center gap-1 transition-colors cursor-pointer ${
                        isLiked
                          ? "text-red-500 font-medium"
                          : "hover:text-neutral-900"
                      }`}
                    >
                      <svg
                        className="w-4 h-4"
                        fill={isLiked ? "currentColor" : "none"}
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.8}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                        />
                      </svg>
                      <span>{post.likesCount + (isLiked ? 1 : 0)}</span>
                    </button>

                    {/* Repost Action */}
                    <button
                      type="button"
                      className="flex items-center gap-1 hover:text-neutral-900 transition-colors cursor-pointer"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.8}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M4.5 12c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3-3m-3 3l3 3m12-3l-3-3m3 3l-3 3"
                        />
                      </svg>
                      <span>{post.repostsCount}</span>
                    </button>
                  </div>

                  {/* Context Badge */}
                  <span className="text-[10px] text-neutral-400 capitalize">
                    {post.category}
                  </span>
                </div>
              </article>
            );
          })
        ) : (
          <div className="bg-white/80 backdrop-blur-xl border border-neutral-200/60 rounded-3xl p-8 text-center">
            <p className="text-xs text-neutral-400">
              No experience posts found in this category.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
