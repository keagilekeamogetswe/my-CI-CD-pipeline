export default function ProfileLoading() {
  return (
    <div className="w-full max-w-lg mx-auto py-6 space-y-6 animate-pulse">
      {/* Main Profile Skeleton */}
      <div className="bg-white border border-neutral-200/80 rounded-3xl overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] relative">
        {/* Cover Banner Skeleton */}
        <div className="h-32 sm:h-36 bg-neutral-200" />

        {/* Header Row: Avatar & Action Buttons */}
        <div className="px-6 sm:px-8 pb-7 relative">
          <div className="flex items-end justify-between -mt-12 mb-4">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full ring-4 ring-white bg-neutral-200 shrink-0" />
            <div className="flex items-center gap-2">
              <div className="h-9 w-28 bg-neutral-200 rounded-xl" />
              <div className="h-9 w-9 bg-neutral-200 rounded-xl" />
            </div>
          </div>

          {/* User Name & Handle */}
          <div className="space-y-2 mb-4">
            <div className="h-6 w-44 bg-neutral-200 rounded-lg" />
            <div className="h-3.5 w-24 bg-neutral-200 rounded-md" />
          </div>

          {/* Followers & Following Bar */}
          <div className="flex items-center gap-6 py-3.5 my-3 border-y border-neutral-100">
            <div className="h-4 w-20 bg-neutral-200 rounded-md" />
            <div className="h-4 w-20 bg-neutral-200 rounded-md" />
          </div>

          {/* Bio Section */}
          <div className="space-y-2 mb-4">
            <div className="h-3.5 w-full bg-neutral-200 rounded-md" />
            <div className="h-3.5 w-4/5 bg-neutral-200 rounded-md" />
          </div>

          {/* Website Link */}
          <div className="h-3.5 w-36 bg-neutral-200 rounded-md mb-5" />

          {/* Story Highlights Section */}
          <div className="pt-2 border-t border-neutral-100">
            <div className="flex items-center justify-between mb-3">
              <div className="h-3.5 w-16 bg-neutral-200 rounded-md" />
              <div className="h-3.5 w-10 bg-neutral-200 rounded-md" />
            </div>
            <div className="flex items-center gap-4 overflow-hidden pb-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex flex-col items-center gap-1.5 shrink-0"
                >
                  <div className="w-14 h-14 rounded-full bg-neutral-200" />
                  <div className="h-2.5 w-10 bg-neutral-200 rounded-md" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Activity Gallery Skeleton */}
      <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 space-y-4 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between">
          <div className="h-4 w-28 bg-neutral-200 rounded-md" />
          <div className="h-4 w-12 bg-neutral-200 rounded-md" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="aspect-square bg-neutral-200 rounded-xl" />
          <div className="aspect-square bg-neutral-200 rounded-xl" />
          <div className="aspect-square bg-neutral-200 rounded-xl" />
        </div>
      </div>

      {/* Events / Experiences Section Skeleton */}
      <div className="bg-white border border-neutral-200/80 rounded-3xl p-5 space-y-3 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)]">
        <div className="h-4 w-32 bg-neutral-200 rounded-md mb-2" />
        <div className="h-14 bg-neutral-100 rounded-2xl" />
        <div className="h-14 bg-neutral-100 rounded-2xl" />
      </div>
    </div>
  );
}
