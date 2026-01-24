
import EPGProgramCard from "./EPGProgramCard";

export default function EPGTimeline({ channels, selectedChannelId }) {
  return (
    <div className="min-w-max">
      {channels.map((ch) => {
        const isSelected =
          selectedChannelId != null && ch.channelId === selectedChannelId;

        const hasNow = Boolean(ch.now);

        const programs = [
          ...(ch.now ? [{ ...ch.now, __kind: "now" }] : []),
          ...((ch.next || []).map((p) => ({ ...p, __kind: "next" }))),
        ];

        return (
          <div
            key={ch.channelId ?? ch.name}
            className={[
              "h-20 flex border-b border-neutral-800",
              isSelected ? "bg-neutral-900/40 ring-1 ring-blue-500/40" : "",
            ].join(" ")}
          >
            {programs.length === 0 ? (
              <div className="p-3 text-gray-400 flex items-center gap-2">
                {/* ✅ LIVE badge when selected + no current program + no programs */}
                {isSelected && !hasNow && (
                  <span className="text-[10px] font-bold tracking-wide px-2 py-0.5 rounded bg-red-600/20 text-red-300 border border-red-500/30">
                    LIVE
                  </span>
                )}
                <span>
                  {ch.matched ? "No programs in range." : "No EPG match."}
                </span>
              </div>
            ) : (
              programs.map((p, idx) => (
                <EPGProgramCard
                  key={`${p.start || "no-start"}-${p.title || "no-title"}-${p.__kind}`}
                  program={p}
                  // ✅ NOW badge only for selected channel’s current program
                  showNowBadge={isSelected && p.__kind === "now"}
                  // ✅ LIVE badge when selected channel has no current program data:
                  // place it on the first visible card (usually the first "next")
                  showLiveBadge={isSelected && !hasNow && idx === 0}
                />
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}
