"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AccessTokenDeamon } from "@/providers/access-token.deamon";

export interface AvatarProps {
  src?: string | Blob;
  initials?: string;
  color?: string;
  size?: string;
  user_id?: string;
  alt?: string;
  className?: string;
}

export function Avatar({
  src,
  initials = "U",
  color = "bg-neutral-800",
  size,
  user_id,
  alt = "Profile picture",
  className = "",
}: AvatarProps) {
  const router = useRouter();
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [imageError, setImageError] = useState<boolean>(false);

  // If size or className is passed, use it; otherwise fallback to filling the container (w-full h-full)
  const layoutClasses = className || size || "w-full h-full";

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (user_id) {
      router.push(`/profile/${user_id}/`);
    }
  };

  useEffect(() => {
    let currentUrl: string | null = null;
    let isMounted = true;

    async function loadAuthenticatedImage() {
      setIsLoading(true);
      setImageError(false);
      setObjectUrl(null);

      const target = src || (user_id ? `/api/profile/${user_id}/picture` : null);

      if (!target) {
        setIsLoading(false);
        return;
      }

      try {
        let imageBlob: Blob;

        if (target instanceof Blob) {
          imageBlob = target;
        } else {
          const response = await AccessTokenDeamon.fetch(target, {
            method: "GET",
          });

          if (!response.ok) {
            throw new Error(`Failed to load image: ${response.status}`);
          }

          imageBlob = await response.blob();
        }

        currentUrl = URL.createObjectURL(imageBlob);

        if (isMounted) {
          setObjectUrl(currentUrl);
        }
      } catch (err) {
        console.error("Error loading avatar image:", err);
        if (isMounted) {
          setImageError(true);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadAuthenticatedImage();

    return () => {
      isMounted = false;
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
      }
    };
  }, [src, user_id]);

  const baseImageClasses =
    `${layoutClasses} shrink-0 cursor-pointer rounded-full object-cover ring-1 ring-neutral-200/80 shadow-sm transition-transform hover:opacity-90 active:scale-95`.trim();

  // Loading skeleton state
  if (isLoading) {
    return (
      <div
        className={`${layoutClasses} shrink-0 animate-pulse rounded-full bg-neutral-200 shadow-sm`}
      />
    );
  }

  // Display fetched image
  if (objectUrl && !imageError) {
    return (
      <img
        src={objectUrl}
        alt={alt}
        onError={() => setImageError(true)}
        onClick={handleClick}
        className={baseImageClasses}
      />
    );
  }

  // Fallback state: display initials
  return (
    <span
      aria-hidden="true"
      onClick={handleClick}
      className={`${layoutClasses} ${color} grid shrink-0 cursor-pointer place-items-center rounded-full text-xs font-bold text-white shadow-sm transition-transform hover:opacity-90 active:scale-95`}
    >
      {initials}
    </span>
  );
}
