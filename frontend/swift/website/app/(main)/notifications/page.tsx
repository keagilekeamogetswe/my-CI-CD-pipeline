import { Avatar } from "../components/avatar";

export default function NotificationsPage() {
  const notifications = [
    ["MC", "bg-fuchsia-500", "Maya mentioned you in Design Crew.", "2 min ago"],
    ["JL", "bg-amber-500", "Jordan Lee accepted your invitation.", "1 hr ago"],
    ["OC", "bg-cyan-600", "Open Circle posted a new discussion.", "3 hrs ago"],
    ["PS", "bg-rose-500", "Priya shared an event with you.", "Yesterday"],
  ];

  return (
    <section className="flex-1 overflow-y-auto bg-[#f8f9fc] px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
          Stay Up to Date
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Notifications
        </h1>
        <div className="mt-8 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/80">
          {notifications.map(([initials, color, text, time], index) => (
            <button
              key={text}
              type="button"
              className={`flex w-full touch-manipulation items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-indigo-600 ${
                index < notifications.length - 1
                  ? "border-b border-slate-100"
                  : ""
              }`}
            >
              <Avatar initials={initials} color={color} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-slate-800">
                  {text}
                </span>
                <span className="mt-1 block text-xs text-slate-400">
                  {time}
                </span>
              </span>
              {index < 2 && (
                <span
                  className="size-2 shrink-0 rounded-full bg-indigo-600"
                  aria-label="Unread"
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
