export default function EPGProgramCard({ program }) {
  const title = program?.title || "Untitled";
  const desc = program?.desc || "";
  const start = program?.start ? new Date(program.start) : null;
  const stop = program?.stop ? new Date(program.stop) : null;

  const timeLabel =
    start && stop
      ? `${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${stop.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}`
      : "";

  return (
    <div className="w-48 p-3 border-r border-neutral-800 hover:bg-neutral-900 transition">
      <div className="text-sm font-semibold line-clamp-2">{title}</div>
      {timeLabel && <div className="text-xs text-gray-400 mt-1">{timeLabel}</div>}
      {desc && <div className="text-xs text-gray-300 mt-2 line-clamp-3">{desc}</div>}
    </div>
  );
}
