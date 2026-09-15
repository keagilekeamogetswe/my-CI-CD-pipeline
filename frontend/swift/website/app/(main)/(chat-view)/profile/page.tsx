"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AccessTokenDeamon } from "@/providers/access-token.deamon";
import ActivityGallery from "./components/activity.gallery";
import EventSection from "./components/events";
import EventExperiencesSection from "./components/experience";

interface UserProfile {
  id: string;
  name: string;
  username?: string;
  email: string;
  bio: string | null;
  avatar_url: string | null;
  cover_url?: string | null;
  followers_count?: number;
  following_count?: number;
  social_links?: { platform: string; handle: string; url: string }[];
  is_following?: boolean;
}

export default function SocialProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await AccessTokenDeamon.fetch("/api/user/profile", {
          method: "GET",
        });
        const data = await response.json();
        const user = data.user || data;
        setProfile(user);
        setIsFollowing(user.is_following || false);
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleFollowToggle = () => {
    setIsFollowing((prev) => !prev);
    // Call follow/unfollow API endpoint here
  };

  if (loading) {
    return (
      <div className="w-full max-w-lg mx-auto">
        <div className="bg-white border border-neutral-200/80 rounded-3xl p-8 flex items-center justify-center min-h-[400px]">
          <span className="text-xs font-medium text-neutral-400 animate-pulse">
            Loading profile...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 overflow-scroll">
      <div className="w-full">
        <div className="bg-white border border-neutral-200/80 rounded-3xl overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] transition-all">
          {/* 1. Cover Banner */}
          <div className="relative h-32 sm:h-36 bg-gradient-to-r from-neutral-800 to-neutral-950 overflow-hidden">
            {profile?.cover_url && (
              <Image
                src={profile.cover_url}
                alt="Cover photo"
                fill
                className="object-cover opacity-80"
              />
            )}
            <div className="absolute inset-0 bg-black/10" />
          </div>

          <div className="px-6 sm:px-8 pb-8 pt-0 relative">
            {/* Header Row: Avatar & Action Buttons */}
            <div className="flex items-end justify-between -mt-14 mb-4">
              {/* Avatar with Status Indicator */}
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full ring-4 ring-white bg-white shadow-md">
                <div className="w-full h-full rounded-full overflow-hidden bg-neutral-100 flex items-center justify-center">
                  {profile?.avatar_url ? (
                    <Image
                      src={profile.avatar_url}
                      alt={profile.name || "User avatar"}
                      width={112}
                      height={112}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <svg
                      className="w-10 h-10 text-neutral-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0"
                      />
                    </svg>
                  )}
                </div>
                <span
                  className="absolute bottom-1 right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"
                  title="Online"
                />
              </div>

              {/* Quick Social Actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleFollowToggle}
                  className={`h-9 px-4 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    isFollowing
                      ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-800"
                      : "bg-neutral-900 hover:bg-neutral-800 text-white shadow-sm"
                  }`}
                >
                  {isFollowing ? "Following" : "Follow"}
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/chats")}
                  className="h-9 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                  title="Send Message"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a.75.75 0 01-1.074-.85 5.258 5.258 0 011.403-2.52C4.305 16.143 3 14.19 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* User Info & Identity */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <h1 className="text-xl font-bold tracking-tight text-neutral-900">
                  {profile?.name || "Anonymous"}
                </h1>
                {/* Social Verification Badge */}
                <svg
                  className="w-4 h-4 text-sky-500 fill-current"
                  viewBox="0 0 24 24"
                >
                  <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.79-4-4-4-.495 0-.965.084-1.4.238C14.55 2.475 13.18 1.6 11.6 1.6c-1.58 0-2.95.875-3.6 2.148-.435-.154-.905-.238-1.4-.238-2.21 0-4 1.79-4 4 0 .495.084.965.238 1.4C1.475 9.55.6 10.92.6 12.5c0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.79 4 4 4 .495 0 .965-.084 1.4-.238 1.25 1.273 2.62 2.148 4.2 2.148 1.58 0 2.95-.875 3.6-2.148.435.154.905.238 1.4.238 2.21 0 4-1.79 4-4 0-.495-.084-.965-.238-1.4 1.273-1.25 2.148-2.62 2.148-4.2zm-12.28 4.3l-4.24-4.24 1.41-1.41 2.83 2.83 6.36-6.36 1.41 1.41-7.77 7.77z" />
                </svg>
              </div>
              <p className="text-xs text-neutral-400 font-mono">
                @
                {profile?.username ||
                  profile?.email?.split("@")[0] ||
                  "username"}
              </p>
            </div>

            {/* Social Stats Counters */}
            <div className="flex items-center gap-6 py-4 my-3 border-y border-neutral-100 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-neutral-900">
                  {profile?.followers_count ?? 142}
                </span>
                <span className="text-neutral-500">Followers</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-neutral-900">
                  {profile?.following_count ?? 89}
                </span>
                <span className="text-neutral-500">Following</span>
              </div>
            </div>

            {/* Bio Section */}
            {profile?.bio && (
              <div className="mb-4">
                <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed">
                  {profile.bio}
                </p>
              </div>
            )}

            {/* Social Links Bar */}
            <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-neutral-500">
              <div className="flex items-center gap-1">
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
                    d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
                  />
                </svg>
                <a
                  href="#"
                  className="hover:underline text-neutral-800 font-medium"
                >
                  linktr.ee/{profile?.username || "user"}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ActivityGallery />
      <EventSection />
      <EventExperiencesSection />
    </div>
  );
}
