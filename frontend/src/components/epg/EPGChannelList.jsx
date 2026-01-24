
import socketService from "../../services/SocketService";

export default function EPGChannelList({
  channels,
  onChannelSelected,
  onChannelSelectCheckPermission,
}) {
  const handleSelect = (ch, e) => {
    e.preventDefault();
    e.stopPropagation();

    const id = ch.channelId; // backend EPG uses channelId
    if (id === null || id === undefined) return;

    // ✅ Option A: permission check handles opening Admin modal elsewhere
    if (onChannelSelectCheckPermission && !onChannelSelectCheckPermission()) {
      return;
    }

    socketService.setCurrentChannel(id);
    onChannelSelected?.(); // optional: close drawer
  };

  return (
    <div className="bg-neutral-900 border-r border-neutral-800 overflow-x-hidden">
      {channels.map((ch) => {
        const src = ch.logo || ch.avatar || "";

        return (
          <button
            key={ch.channelId ?? ch.name}
            type="button"
            onClick={(e) => handleSelect(ch, e)}
            className="w-full text-left h-20 flex items-center gap-3 p-3 border-b border-neutral-800 hover:bg-neutral-800 transition"
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
              <div className="text-xs text-gray-400">
                {ch.matched ? "EPG OK" : "No match"}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}


