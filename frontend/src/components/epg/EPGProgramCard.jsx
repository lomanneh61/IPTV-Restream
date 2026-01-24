
export default function EPGProgramCard({
  program,
  showNowBadge = false,
  showLiveBadge = false,
}) {
  const title = program?.title || "Untitled";
  const desc = program?.desc || "";
  const start = program?.start ? new Date(program.start) : null;
  const stop = program?.stop ? new Date(program.stop) : null;

  const startOk = start && !isNaN(start.getTime()) ? start : null;
  const stopOk = stop && !isNaN(stop.getTime()) ? stop : null;

  const timeLabel =
    startOk && stopOk
      ? `${startOk.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${stopOk.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}`
      : "";

  // Prefer NOW over LIVE if both accidentally set
  const badge = showNowBadge ? "NOW" : showLiveBadge ? "LIVE" : null;

  return (
    <div className="w-48 h-20 p-3 border-r border-neutral-800 hover:bg-neutral-900 transition overflow-hidden">
      {/* Top row: badge + title */}
      <div className="flex items-start gap-2">
        {badge && (
          <span
            className={[
              "shrink-0 text-[10px] font-bold tracking-wide px-2 py-0.5 rounded border",
              badge === "NOW"
                ? "bg-green-600/20 text-green-300 border-green-500/30"
                : "bg-blue-600/20 text-blue-300 border-blue-500/30",
            ].join(" ")}
          >
            {badge}
          </span>
        )}

        <div className="text-sm font-semibold line-clamp-2">{title}</div>
      </div>

      {timeLabel && <div className="text-xs text-gray-400 mt-1">{timeLabel}</div>}
      {desc && <div className="text-xs text-gray-300 mt-1 line-clamp-1">{desc}</div>}
    </div>
  );
}

