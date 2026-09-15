import { useRouter, useSearchParams } from "next/navigation";

export function Avatar({
  initials,
  color,
  size = "size-11",
  user_id,
}: {
  initials: string;
  color: string;
  size?: string;
  user_id: string;
}) {
  const router = useRouter();
  return (
    <span
      aria-hidden="true"
      className={`${size} ${color} grid shrink-0 place-items-center rounded-full text-xs font-bold text-white shadow-sm`}
      onClick={(e) => {
        e.stopPropagation();
        router.push(`/profile/${user_id}/`);
      }}
    >
      {initials}
    </span>
  );
}
