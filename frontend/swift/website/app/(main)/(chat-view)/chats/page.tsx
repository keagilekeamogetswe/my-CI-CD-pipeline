export default function ChatsPage() {
  return (
    <section className="hidden min-h-0 min-w-0 flex-1 flex-col items-center justify-center bg-neutral-50/50 p-6 text-center md:flex">
      <div className="flex max-w-sm flex-col items-center">
        <div className="relative mb-6 flex size-20 items-center justify-center rounded-3xl bg-neutral-100 ring-8 ring-neutral-100/50">
          <svg
            className="size-10 text-neutral-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
            <path d="M8 10h.01" />
            <path d="M12 10h.01" />
            <path d="M16 10h.01" />
          </svg>
          <span className="absolute -bottom-1 -right-1 flex size-6 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-neutral-200">
            <svg
              className="size-3.5 text-neutral-500"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </span>
        </div>

        <h2 className="text-base font-semibold text-neutral-900">
          No message selected
        </h2>
        <p className="mt-1.5 text-sm text-neutral-500">
          Choose a conversation from the sidebar to view messages or start a new
          chat.
        </p>
      </div>
    </section>
  );
}
