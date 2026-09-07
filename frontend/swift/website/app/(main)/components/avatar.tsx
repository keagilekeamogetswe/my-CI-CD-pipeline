export function Avatar({
  initials,
  color,
  size = "size-11",
}: {
  initials: string;
  color: string;
  size?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`${size} ${color} grid shrink-0 place-items-center rounded-full text-xs font-bold text-white shadow-sm`}
    >
      {initials}
    </span>
  );
}
