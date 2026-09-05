"use client";

import Image from "next/image";
import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const MAX_BIO_LENGTH = 160;

export default function ProfileSetupPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const validateAndProcessFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, or WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5MB.");
      return;
    }

    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      validateAndProcessFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndProcessFile(file);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const goToNextStep = () => {
    router.push("/home");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = {
        avatar: avatarPreview,
        bio: bio.trim(),
      };

      const request = await fetch("/api/profile-setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const response = await request.json();

      if (request.status !== 200) {
        setError(
          response.message || "Failed to save profile. Please try again.",
        );
        setLoading(false);
        return;
      }

      goToNextStep();
    } catch (err) {
      console.error(err);
      setError("An unexpected network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="bg-white border border-neutral-200/80 rounded-3xl p-8 sm:p-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] transition-all">
        {/* Progress & Header */}
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900">
            Tell more about yourself
          </h1>
          <p className="text-sm text-neutral-500 max-w-sm mx-auto leading-relaxed">
            Add a photo and quick bio. You can always change this later.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-3.5 bg-red-50/80 border border-red-200/70 rounded-xl text-sm text-red-600 flex items-start gap-2.5 animate-in fade-in-50 duration-200">
            <svg
              className="w-4 h-4 text-red-500 mt-0.5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span className="flex-1">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-7">
          {/* Avatar Section */}
          <div className="flex flex-col items-center">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`group relative w-28 h-28 sm:w-32 sm:h-32 rounded-full cursor-pointer transition-all duration-200 ${
                isDragging
                  ? "ring-4 ring-neutral-900/10 scale-105"
                  : "hover:ring-4 hover:ring-neutral-100"
              }`}
            >
              <div className="w-full h-full rounded-full border border-neutral-200 overflow-hidden bg-neutral-50 flex items-center justify-center">
                {avatarPreview ? (
                  <Image
                    src={avatarPreview}
                    alt="Profile preview"
                    width={128}
                    height={128}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-neutral-400 group-hover:text-neutral-600 transition-colors">
                    <svg
                      className="w-9 h-9 sm:w-10 sm:h-10 stroke-[1.25]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                      />
                    </svg>
                  </div>
                )}
              </div>

              {/* Hover overlay with camera icon */}
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[11px] font-medium backdrop-blur-[1px] transition-opacity duration-200">
                <svg
                  className="w-5 h-5 mb-0.5"
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
                <span>{avatarPreview ? "Change" : "Upload"}</span>
              </div>

              {/* Action Badge */}
              <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-neutral-900 border-2 border-white text-white flex items-center justify-center shadow-md">
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
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />

            <div className="mt-3 flex items-center gap-3 text-xs">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-neutral-900 font-medium hover:underline cursor-pointer"
              >
                {avatarPreview ? "Choose another photo" : "Upload photo"}
              </button>
              {avatarPreview && (
                <>
                  <span className="text-neutral-300">•</span>
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="text-red-500 font-medium hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                </>
              )}
            </div>
            <p className="mt-1 text-[11px] text-neutral-400">
              Drag & drop or click • PNG, JPG up to 5MB
            </p>
          </div>

          {/* Bio Field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-neutral-700">
              <label htmlFor="bio">Your Bio</label>
              <span
                className={`tabular-nums transition-colors ${
                  bio.length >= MAX_BIO_LENGTH
                    ? "text-red-500 font-semibold"
                    : "text-neutral-400"
                }`}
              >
                {bio.length}/{MAX_BIO_LENGTH}
              </span>
            </div>

            <div className="relative">
              <textarea
                id="bio"
                name="bio"
                rows={3}
                maxLength={MAX_BIO_LENGTH}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share a few words about you"
                className="w-full text-sm text-neutral-900 placeholder:text-neutral-400 bg-neutral-50/50 hover:bg-neutral-50 focus:bg-white border border-neutral-200 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 rounded-2xl p-3.5 transition-all outline-none resize-none"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-2 space-y-3">
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-neutral-900 hover:bg-neutral-800 active:scale-[0.99] text-white font-medium text-sm rounded-xl transition-all shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg
                    className="w-4 h-4 animate-spin text-white/80"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Saving profile...</span>
                </>
              ) : (
                "Save and continue"
              )}
            </button>

            <button
              type="button"
              onClick={goToNextStep}
              disabled={loading}
              className="w-full py-2.5 text-neutral-500 hover:text-neutral-800 text-xs font-medium rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              Skip for now, go to dashboard
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
