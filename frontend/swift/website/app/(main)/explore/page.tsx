const exploreCards = [
  {
    category: "Design",
    title: "Building products people love",
    author: "Maya Chen",
    members: "12.8K members",
    gradient: "from-fuchsia-500 via-violet-500 to-indigo-600",
  },
  {
    category: "Technology",
    title: "The future of human connection",
    author: "Open Circle",
    members: "8.4K members",
    gradient: "from-cyan-400 via-sky-500 to-blue-700",
  },
  {
    category: "Wellness",
    title: "Small habits, lasting change",
    author: "Better Every Day",
    members: "21K members",
    gradient: "from-orange-400 via-rose-500 to-pink-700",
  },
];
export default function ExplorePage() {
  return (
    <section className="flex-1 overflow-y-auto bg-[#f8f9fc] px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
          Find Your People
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 text-balance">
          Explore communities built around what you love.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
          Discover thoughtful conversations, upcoming gatherings, and people who
          share your interests.
        </p>
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {exploreCards.map((card) => (
            <article
              key={card.title}
              className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200/80"
            >
              <div
                className={`flex h-44 items-end bg-gradient-to-br ${card.gradient} p-5`}
              >
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                  {card.category}
                </span>
              </div>
              <div className="p-5">
                <h2 className="text-lg font-bold text-slate-950 text-balance">
                  {card.title}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  {card.author} · {card.members}
                </p>
                <button
                  type="button"
                  className="mt-5 w-full touch-manipulation rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                  View Community
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
