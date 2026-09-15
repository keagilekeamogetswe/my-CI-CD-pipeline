"use client";

import Image from "next/image";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import ActivityGallery from "./components/activity.gallery";
import EventSection from "./components/events";
import EventExperiencesSection from "./components/experience";

export interface HighlightItem {
  id: string;
  title: string;
  cover_url: string;
}

export interface OwnUserProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  bio: string;
  avatar_url: string | null;
  cover_url: string | null;
  followers_count: number;
  following_count: number;
  website_url?: string;
  highlights?: HighlightItem[];
}

const DEFAULT_OWN_PROFILE: OwnUserProfile = {
  id: "user-self",
  name: "Keamogetswe Keagile",
  username: "keagile_dev",
  email: "kea@example.com",
  bio: "Full-stack engineer crafting high-throughput microservices & clean UI systems. 🚀",
  avatar_url:
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80",
  cover_url:
    "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1200&q=80",
  followers_count: 1240,
  following_count: 310,
  website_url: "github.com/keamogetswe",
  highlights: [
    {
      id: "h-1",
      title: "Projects",
      cover_url:
        "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=300&q=80",
    },
    {
      id: "h-2",
      title: "Tech Talks",
      cover_url:
        "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=300&q=80",
    },
    {
      id: "h-3",
      title: "Setup '26",
      cover_url:
        "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=300&q=80",
    },
  ],
};

interface OwnProfilePageProps {
  initialProfile?: OwnUserProfile;
}

export default function OwnProfilePage({
  initialProfile = DEFAULT_OWN_PROFILE,
}: OwnProfilePageProps) {
  const router = useRouter();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Editable Profile States
  const [profile, setProfile] = useState<OwnUserProfile>(initialProfile);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState(profile.bio);
  const [showEditModal, setShowEditModal] = useState(false);
  const [nameInput, setNameInput] = useState(profile.name);
  const [usernameInput, setUsernameInput] = useState(profile.username);
  const [websiteInput, setWebsiteInput] = useState(profile.website_url || "");

  // File Upload Handlers (Presentational preview update)
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setProfile((prev) => ({ ...prev, avatar_url: imageUrl }));
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      setProfile((prev) => ({ ...prev, cover_url: imageUrl }));
    }
  };

  // Inline Bio Save Handler
  const handleSaveBio = () => {
    setProfile((prev) => ({ ...prev, bio: bioInput }));
    setIsEditingBio(false);
  };

  // Highlights Handler
  const handleAddHighlight = () => {
    const title = window.prompt(
      "Enter Highlight Title (e.g., 'Travel', 'Code'):",
    );
    if (!title) return;

    const newHighlight: HighlightItem = {
      id: `h-${Date.now()}`,
      title,
      cover_url:
        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80",
    };

    setProfile((prev) => ({
      ...prev,
      highlights: [...(prev.highlights || []), newHighlight],
    }));
  };

  // Modal Save Handler
  const handleSaveModalProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfile((prev) => ({
      ...prev,
      name: nameInput,
      username: usernameInput,
      website_url: websiteInput,
    }));
    setShowEditModal(false);
  };

  return (
    <div className="w-full max-w-lg mx-auto py-6 space-y-6">
      {/* Hidden File Inputs for Profile Photo & Cover Uploads */}
      <input
        type="file"
        ref={avatarInputRef}
        onChange={handleAvatarChange}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={coverInputRef}
        onChange={handleCoverChange}
        accept="image/*"
        className="hidden"
      />

      {/* Main Profile Container */}
      <div className="bg-white border border-neutral-200/80 rounded-3xl overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] transition-all relative">
        {/* 1. Cover Banner with Change Cover Action */}
        <div className="relative h-32 sm:h-36 bg-neutral-900 overflow-hidden group">
          {profile.cover_url && (
            <Image
              src={profile.cover_url}
              alt="Cover photo"
              fill
              className="object-cover opacity-80"
              unoptimized
            />
          )}
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />

          {/* Change Cover Button */}
          <button
            type="button"
            onClick={() => coverInputRef.current?.click()}
            className="absolute top-3 right-3 h-8 px-3 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer border border-white/10"
          >
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
                d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
              />
            </svg>
            <span>Edit Cover</span>
          </button>
        </div>

        {/* 2. Header Row: Avatar & Owner Action Buttons */}
        <div className="px-6 sm:px-8 pb-7 relative">
          <div className="flex items-end justify-between -mt-12 mb-4">
            {/* Avatar with Camera Trigger Overlay */}
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-full ring-4 ring-white bg-white shadow-md group">
              <div className="w-full h-full rounded-full overflow-hidden bg-neutral-100 flex items-center justify-center relative">
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
                {/* Hover Trigger for Avatar Change */}
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-0.5 cursor-pointer"
                  title="Change Avatar"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                    />
                  </svg>
                  <span className="text-[10px] font-medium">Update</span>
                </button>
              </div>
            </div>

            {/* Owner Management Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowEditModal(true)}
                className="h-9 px-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
              >
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
                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                  />
                </svg>
                <span>Edit Profile</span>
              </button>

              <button
                type="button"
                onClick={() => router.push("/settings")}
                className="h-9 px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-medium transition-colors cursor-pointer border border-neutral-200/60"
                title="Account Settings"
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
                    d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* User Name & Handle */}
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xl font-bold tracking-tight text-neutral-900">
                {profile.name}
              </h1>
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

          {/* 3. Interactive Bio Section with Quick Inline Edit */}
          <div className="mb-4 group/bio relative">
            {isEditingBio ? (
              <div className="space-y-2">
                <textarea
                  value={bioInput}
                  onChange={(e) => setBioInput(e.target.value)}
                  className="w-full text-xs sm:text-sm p-3 bg-neutral-50 border border-neutral-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 transition-all resize-none"
                  rows={3}
                  maxLength={160}
                />
                <div className="flex items-center justify-between text-[11px] text-neutral-400 px-1">
                  <span>{160 - bioInput.length} characters left</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingBio(false)}
                      className="px-3 py-1 text-neutral-600 hover:text-neutral-900 font-medium cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveBio}
                      className="px-3 py-1 bg-neutral-900 text-white rounded-lg font-medium hover:bg-neutral-800 cursor-pointer"
                    >
                      Save Bio
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs sm:text-sm text-neutral-700 leading-relaxed">
                  {profile.bio || (
                    <span className="text-neutral-400 italic">
                      No bio added yet. Click to add a bio.
                    </span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => setIsEditingBio(true)}
                  className="p-1 text-neutral-400 hover:text-neutral-800 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
                  title="Edit bio"
                >
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
                      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* User Website Link */}
          {profile.website_url && (
            <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-5">
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
                href={`https://${profile.website_url.replace(/^https?:\/\//, "")}`}
                target="_blank"
                rel="noreferrer"
                className="hover:underline text-neutral-800 font-medium"
              >
                {profile.website_url}
              </a>
            </div>
          )}

          {/* 4. Story Highlights Section (Facebook / Instagram Style) */}
        </div>
      </div>

      {/* Embedded Sub-Sections */}
      <ActivityGallery />
      <EventSection />
      <EventExperiencesSection />

      {/* 5. Edit Profile Modal Dialog */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-neutral-200 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-neutral-900">
                Edit Profile Info
              </h2>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded-lg cursor-pointer"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form
              onSubmit={handleSaveModalProfile}
              className="p-6 space-y-4 text-xs"
            >
              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">
                  Website / Link
                </label>
                <input
                  type="text"
                  value={websiteInput}
                  onChange={(e) => setWebsiteInput(e.target.value)}
                  placeholder="e.g. github.com/username"
                  className="w-full p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-neutral-600 hover:text-neutral-900 font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl font-semibold shadow-sm cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
