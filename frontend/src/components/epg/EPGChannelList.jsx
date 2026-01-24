export default function EPGChannelList({ channels }) {
  return (
    <div className="bg-neutral-900 border-r border-neutral-800 overflow-x-hidden">
      {channels.map((ch) => {
        const src = ch.logo || ch.avatar || "";

        return (
          <div
            key={ch.channelId ?? ch.name}
            className="h-20 flex items-center gap-3 p-3 border-b border-neutral-800"
          >
            {src ? (
              <img
                src={src}
                alt={ch.name}
                className="w-10 h-10 object-contain flex-shrink-0"
                draggable={false}
              />
            ) : (
              <div className="w-10 h-10 bg-neutral-700 rounded flex-shrink-0" />
            )}

            {/* ✅ prevents the name from expanding the column */}
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{ch.name}</div>
              <div className="text-xs text-gray-400">
                {ch.matched ? "EPG OK" : "No match"}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
