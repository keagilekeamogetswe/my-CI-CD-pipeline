export default function EventsPage() {
  const events = [
    ["18", "SEP", "Design Systems Roundtable", "Online · 6:00 PM"],
    ["22", "SEP", "Sunday Community Run", "Riverside Park · 7:00 AM"],
    ["28", "SEP", "Creative Founders Meetup", "The Workshop · 5:30 PM"],
  ];

  return (
    <section className="flex-1 overflow-y-auto bg-[#f8f9fc] px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
          Your Calendar
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Upcoming Events
        </h1>
        <div className="mt-8 space-y-4">
          {events.map(([day, month, title, details]) => (
            <article
              key={title}
              className="flex items-center gap-5 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-5"
            >
              <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-center">
                <div>
                  <strong className="block text-xl leading-none text-indigo-700">
                    {day}
                  </strong>
                  <span className="mt-1 block text-[10px] font-bold tracking-wider text-indigo-500">
                    {month}
                  </span>
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-bold text-slate-950">{title}</h2>
                <p className="mt-1 text-sm text-slate-500">{details}</p>
              </div>
              <button
                type="button"
                className="hidden touch-manipulation rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-2 focus-visible:outline-indigo-600 sm:block"
              >
                View Details
              </button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
