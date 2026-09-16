"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function Avatar({
  src,
  initials,
  color,
  size = "size-10",
  user_id,
  alt = "Profile picture",
}: {
  src?: string;
  initials: string;
  color: string;
  size?: string;
  user_id: string;
  alt?: string;
}) {
  const router = useRouter();
  const [imageError, setImageError] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/profile/${user_id}/`);
  };

  if (src && !imageError) {
    return (
      <img
        src={src}
        alt={alt}
        onError={() => setImageError(true)}
        onClick={handleClick}
        className={`${size} shrink-0 cursor-pointer rounded-full object-cover ring-1 ring-neutral-200/80 shadow-sm transition-transform hover:opacity-90 active:scale-95`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      onClick={handleClick}
      className={`${size} ${color} grid shrink-0 cursor-pointer place-items-center rounded-full text-xs font-bold text-white shadow-sm transition-transform hover:opacity-90 active:scale-95`}
    >
      {initials}
    </span>
  );
}
