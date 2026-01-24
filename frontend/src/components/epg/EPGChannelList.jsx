
export default function EPGChannelList({ channels }) {
  return (
    <div className="w-48 bg-neutral-900 border-r border-neutral-800 overflow-y-auto">
      {channels.map((ch) => (
        <div
          key={ch.id}
          className="flex items-center gap-3 p-3 hover:bg-neutral-800 cursor-pointer transition"
        >
          <img
            src={ch.avatar || ch.logo || ""}
            alt={ch.name}
            className="w-10 h-10 object-contain"
          />
          <div className="text-sm font-medium">{ch.name}</div>
        </div>
      ))}
    </div>
  );
}
