"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
// Import your sub-sections or integrate them inline
import EventSection from "../components/events";
import ActivityGallery from "../components/activity.gallery";
import EventExperiencesSection from "../components/experience";

export interface OtherUserProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  bio: string | null;
  avatar_url: string | null;
  cover_url?: string | null;
  followers_count: number;
  following_count: number;
  is_following: boolean;
  is_muted: boolean;
  is_blocked: boolean;
  notifications_enabled: boolean;
}

const DEFAULT_PROFILE: OtherUserProfile = {
  id: "user-902",
  name: "Sipho Dlamini",
  username: "siphod",
  email: "sipho@example.com",
  bio: "Building microservice architectures & cloud infrastructure. Tech community host & speaker.",
  avatar_url:
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80",
  cover_url:
    "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80",
  followers_count: 420,
  following_count: 185,
  is_following: false,
  is_muted: false,
  is_blocked: false,
  notifications_enabled: false,
};

interface PublicProfilePageProps {
  profile?: OtherUserProfile;
}

export default function PublicProfilePage({
  profile = DEFAULT_PROFILE,
}: PublicProfilePageProps) {
  const router = useRouter();

  // Social action UI states initialized directly from props
  const [isFollowing, setIsFollowing] = useState(profile.is_following);
  const [isMuted, setIsMuted] = useState(profile.is_muted);
  const [isBlocked, setIsBlocked] = useState(profile.is_blocked);
  const [isNotifying, setIsNotifying] = useState(profile.notifications_enabled);
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // UI Action Handlers
  const handleFollowToggle = () => {
    setIsFollowing((prev) => !prev);
  };

  const handleMuteToggle = () => {
    setIsMuted((prev) => !prev);
    setShowMoreActions(false);
  };

  const handleBlockToggle = () => {
    if (!isBlocked) {
      const confirmBlock = window.confirm(
        `Are you sure you want to block @${profile.username}? They won't be able to message you or view your profile.`,
      );
      if (!confirmBlock) return;
    }
    setIsBlocked((prev) => !prev);
    setShowMoreActions(false);
  };

  const handleNotificationToggle = () => {
    setIsNotifying((prev) => !prev);
  };

  const handleShareProfile = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
    setShowMoreActions(false);
  };

  const handleReportUser = () => {
    setShowMoreActions(false);
    alert(
      `Report submitted for @${profile.username}. Our team will review it.`,
    );
  };

  return (
    <div className="w-full max-w-lg mx-auto py-6 space-y-6">
      {/* Main Profile Card */}
      <div className="bg-white border border-neutral-200/80 rounded-3xl overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] transition-all relative">
        {/* Cover Banner */}
        <div className="relative h-32 sm:h-36 bg-neutral-900 overflow-hidden">
          {profile.cover_url && (
            <Image
              src={profile.cover_url}
              alt="Cover photo"
              fill
              className="object-cover opacity-80"
              unoptimized
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />
        </div>

        {/* Profile Content */}
        <div className="px-6 sm:px-8 pb-7 relative">
          {/* Header Row: Avatar & Action Bar */}
          <div className="flex items-end justify-between -mt-12 mb-4">
            {/* Avatar */}
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full ring-4 ring-white bg-white shadow-md">
              <div className="w-full h-full rounded-full overflow-hidden bg-neutral-100 flex items-center justify-center">
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.name}
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
            </div>

            {/* Action Buttons Bar */}
            <div className="flex items-center gap-2 relative">
              {/* Follow Button */}
              <button
                type="button"
                onClick={handleFollowToggle}
                className={`h-9 px-4 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm ${
                  isBlocked
                    ? "bg-neutral-200 text-neutral-500 cursor-not-allowed"
                    : isFollowing
                      ? "bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-200"
                      : "bg-neutral-900 hover:bg-neutral-800 text-white"
                }`}
                disabled={isBlocked}
              >
                {isBlocked ? "Blocked" : isFollowing ? "Following" : "Follow"}
              </button>

              {/* Direct Message Button */}
              <button
                type="button"
                onClick={() => router.push(`/chats?user=${profile.id}`)}
                className="h-9 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-medium transition-colors cursor-pointer border border-neutral-200/60"
                title="Message"
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

              {/* Post Notification Bell Toggle */}
              {isFollowing && (
                <button
                  type="button"
                  onClick={handleNotificationToggle}
                  className={`h-9 px-2.5 rounded-xl text-xs transition-colors cursor-pointer border ${
                    isNotifying
                      ? "bg-amber-50 text-amber-600 border-amber-200"
                      : "bg-neutral-100 hover:bg-neutral-200 text-neutral-600 border-neutral-200/60"
                  }`}
                  title={
                    isNotifying
                      ? "Notifications Enabled"
                      : "Notify on new posts"
                  }
                >
                  <svg
                    className="w-4 h-4"
                    fill={isNotifying ? "currentColor" : "none"}
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                    />
                  </svg>
                </button>
              )}

              {/* Overflow Actions Trigger (...) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMoreActions((prev) => !prev)}
                  className="h-9 px-2.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl text-xs transition-colors cursor-pointer border border-neutral-200/60"
                  title="More options"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
                    />
                  </svg>
                </button>

                {/* Dropdown Menu for Mute, Block, Share, Report */}
                {showMoreActions && (
                  <div className="absolute right-0 mt-2 w-48 bg-white border border-neutral-200/80 rounded-2xl shadow-xl z-30 py-1.5 text-xs animate-in fade-in zoom-in-95 duration-150">
                    {/* Share Profile Link */}
                    <button
                      type="button"
                      onClick={handleShareProfile}
                      className="w-full px-3.5 py-2 text-left text-neutral-700 hover:bg-neutral-50 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <svg
                        className="w-3.5 h-3.5 text-neutral-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0-10.628a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5zm0 10.628a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z"
                        />
                      </svg>
                      <span>
                        {copiedLink ? "Link Copied!" : "Share Profile"}
                      </span>
                    </button>

                    {/* Mute User Toggle */}
                    <button
                      type="button"
                      onClick={handleMuteToggle}
                      className="w-full px-3.5 py-2 text-left text-neutral-700 hover:bg-neutral-50 flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <svg
                        className="w-3.5 h-3.5 text-neutral-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.531V19.94a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z"
                        />
                      </svg>
                      <span>
                        {isMuted
                          ? "Unmute @" + profile.username
                          : "Mute @" + profile.username}
                      </span>
                    </button>

                    <div className="my-1 border-t border-neutral-100" />

                    {/* Block User Toggle */}
                    <button
                      type="button"
                      onClick={handleBlockToggle}
                      className="w-full px-3.5 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer font-medium"
                    >
                      <svg
                        className="w-3.5 h-3.5 text-red-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                        />
                      </svg>
                      <span>{isBlocked ? "Unblock User" : "Block User"}</span>
                    </button>

                    {/* Report User */}
                    <button
                      type="button"
                      onClick={handleReportUser}
                      className="w-full px-3.5 py-2 text-left text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer font-medium"
                    >
                      <svg
                        className="w-3.5 h-3.5 text-red-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a.48.48 0 00.364-.466V5.059a.48.48 0 00-.594-.466l-3.21.755a9 9 0 01-6.08-.71l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5"
                        />
                      </svg>
                      <span>Report Profile</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* User Name & Handle */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xl font-bold tracking-tight text-neutral-900">
                {profile.name}
              </h1>
              {/* Verified Badge */}
              <svg
                className="w-4 h-4 text-sky-500 fill-current"
                viewBox="0 0 24 24"
              >
                <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.79-4-4-4-.495 0-.965.084-1.4.238C14.55 2.475 13.18 1.6 11.6 1.6c-1.58 0-2.95.875-3.6 2.148-.435-.154-.905-.238-1.4-.238-2.21 0-4 1.79-4 4 0 .495.084.965.238 1.4C1.475 9.55.6 10.92.6 12.5c0 1.58.875 2.95 2.148 3.6-.154.435-.238.905-.238 1.4 0 2.21 1.79 4 4 4 .495 0 .965-.084 1.4-.238 1.25 1.273 2.62 2.148 4.2 2.148 1.58 0 2.95-.875 3.6-2.148.435.154.905.238 1.4.238 2.21 0 4-1.79 4-4 0-.495-.084-.965-.238-1.4 1.273-1.25 2.148-2.62 2.148-4.2zm-12.28 4.3l-4.24-4.24 1.41-1.41 2.83 2.83 6.36-6.36 1.41 1.41-7.77 7.77z" />
              </svg>
            </div>
            <p className="text-xs text-neutral-400 font-mono">
              @{profile.username}
            </p>
          </div>

          {/* Followers & Following Bar */}
          <div className="flex items-center gap-6 py-3.5 my-3 border-y border-neutral-100 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-neutral-900">
                {profile.followers_count}
              </span>
              <span className="text-neutral-500">Followers</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-neutral-900">
                {profile.following_count}
              </span>
              <span className="text-neutral-500">Following</span>
            </div>
          </div>

          {/* User Bio */}
          {profile.bio && (
            <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed mb-4">
              {profile.bio}
            </p>
          )}

          {/* Muted Status Alert Banner */}
          {isMuted && !isBlocked && (
            <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200/80 rounded-xl text-[11px] text-amber-700 flex items-center justify-between">
              <span>You have muted posts from @{profile.username}.</span>
              <button
                onClick={handleMuteToggle}
                className="underline font-semibold cursor-pointer"
              >
                Unmute
              </button>
            </div>
          )}

          {/* Embedded Sub-Sections */}
          <ActivityGallery />
        </div>
      </div>

      {/* Events Section */}
      <EventSection />

      {/* Event Experiences Section */}
      <EventExperiencesSection />
    </div>
  );
}
