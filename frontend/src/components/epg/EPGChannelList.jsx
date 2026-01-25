
import socketService from "../../services/SocketService";

export default function EPGChannelList({
  channels,
  selectedChannelId,
  onChannelSelected,
  onChannelSelectCheckPermission,
}) {
  const handleSelect = (ch, e) => {
    e.preventDefault();
    e.stopPropagation();

    const id = ch.channelId;
    if (id === null || id === undefined) return;

    // ✅ Prevent re-selecting the current channel
    if (selectedChannelId != null && id === selectedChannelId) return;

    // ✅ Option A permission check (Admin modal opens inside canSelectChannel in App.tsx)
    if (onChannelSelectCheckPermission && !onChannelSelectCheckPermission()) return;

    socketService.setCurrentChannel(id);
    onChannelSelected?.();
  };

  return (
    <div className="epg-blue-panel border-r epg-blue-border overflow-x-hidden">
      {channels.map((ch) => {
        const src = ch.logo || ch.avatar || "";
        const isSelected = selectedChannelId != null && ch.channelId === selectedChannelId;

        return (
          <button
            key={ch.channelId ?? ch.name}
            type="button"
            onClick={(e) => handleSelect(ch, e)}
            className={[
              "w-full text-left h-20 flex items-center gap-3 p-3 border-b transition",
              "epg-blue-border epg-row-hover",
              isSelected ? "epg-row-selected" : "",
            ].join(" ")}
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

            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{ch.name}</div>
              <div className="text-xs text-gray-300">
                {ch.matched ? "EPG OK" : "No match"}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
