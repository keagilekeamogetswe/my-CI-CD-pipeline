function Messages() {
  return (
    <div className="space-y-1 px-3 py-3">
      {filteredConversations.length ? (
        filteredConversations.map((conversation, index) => {
          const user_id = conversation.id;
          return (
            <button
              key={conversation.id}
              onClick={() => router.push(`/chats/message/${user_id}/`)}
              type="button"
              className={`flex w-full cursor-pointer touch-manipulation items-center gap-3 rounded-2xl px-3.5 py-3 text-left transition-all duration-200 hover:bg-neutral-100/80 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-900 ${
                index === 0 && !query
                  ? "bg-neutral-100 shadow-sm ring-1 ring-neutral-200/60"
                  : ""
              }`}
            >
              <Avatar
                initials={conversation.initials}
                color={conversation.color}
                user_id={`${user_id}`}
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <strong className="truncate text-sm font-semibold text-neutral-900">
                    {conversation.name}
                  </strong>
                  <span className="shrink-0 text-[11px] text-neutral-400">
                    {conversation.time}
                  </span>
                </span>
                <span className="mt-1 flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-neutral-500">
                    {conversation.preview}
                  </span>
                  {conversation.unread > 0 && (
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-neutral-900 text-[10px] font-bold text-white">
                      {conversation.unread}
                    </span>
                  )}
                </span>
              </span>
            </button>
          );
        })
      ) : (
        <div className="px-4 py-12 text-center">
          <p className="font-semibold text-neutral-900">No chats found</p>
          <p className="mt-1 text-sm text-neutral-500">
            Try searching for another name or message.
          </p>
        </div>
      )}
    </div>
  );
}
