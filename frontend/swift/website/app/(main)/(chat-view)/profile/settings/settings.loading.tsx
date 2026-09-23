export default function SettingsLoading() {
  return (
    <main
      aria-label="Loading settings"
      className="mx-auto w-full max-w-2xl animate-pulse px-6 py-8"
    >
      <header className="border-b border-neutral-200 pb-6 pt-2">
        <div className="h-6 w-24 rounded bg-neutral-200" />
        <div className="mt-2 h-3 w-72 max-w-full rounded bg-neutral-100" />
      </header>

      <section className="space-y-5 px-5 py-6">
        <div className="h-3 w-32 rounded bg-neutral-200" />
        {["w-40", "w-44", "w-36"].map((width, index) => (
          <div
            key={index}
            className="flex min-h-12 items-center justify-between gap-4"
          >
            <div className="space-y-2">
              <div className={`h-3 ${width} rounded bg-neutral-200`} />
              <div className="h-2.5 w-52 max-w-full rounded bg-neutral-100" />
            </div>
            <div className="h-8 w-44 shrink-0 rounded-lg bg-neutral-100" />
          </div>
        ))}
      </section>

      {["Security & Access", "Appearance & Media"].map((section) => (
        <section key={section} className="space-y-5 border-t border-neutral-100 px-5 py-6">
          <div className="h-3 w-36 rounded bg-neutral-200" />
          {[0, 1].map((item) => (
            <div key={item} className="flex min-h-12 items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="h-3 w-40 rounded bg-neutral-200" />
                <div className="h-2.5 w-52 max-w-full rounded bg-neutral-100" />
              </div>
              <div className="h-5 w-9 shrink-0 rounded-full bg-neutral-200" />
            </div>
          ))}
        </section>
      ))}
    </main>
  );
}
