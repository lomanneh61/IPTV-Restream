
export default function EPGChannelList({ channels, selectedChannelId, onSelectChannel }) {
  return (
    <div className="w-56 bg-neutral-900 border-r border-neutral-800 overflow-y-auto">
      {channels.map((ch) => {
        const isSelected = ch.channelId === selectedChannelId;
        const src = ch.logo || ch.avatar || "";

        return (
          <button
            key={ch.channelId ?? ch.name}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onSelectChannel?.(ch.channelId);
            }}
            className={[
              "w-full text-left flex items-center gap-3 p-3 transition",
              "hover:bg-neutral-800",
              isSelected ? "bg-neutral-800" : "",
            ].join(" ")}
          >
            {src ? (
              <img src={src} alt={ch.name} className="w-10 h-10 object-contain" />
            ) : (
              <div className="w-10 h-10 bg-neutral-700 rounded" />
            )}

            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{ch.name}</div>
              <div className="text-xs text-gray-400">
                {ch.matched ? "EPG OK" : "No match"}
                {typeof ch.programmeCount === "number" ? ` • ${ch.programmeCount}` : ""}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
