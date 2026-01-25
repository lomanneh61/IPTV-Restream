
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
              "h-20 flex border-b transition",
              "epg-blue-border epg-row-hover",         // ✅ match ChannelList hover + border theme
              isSelected ? "epg-row-selected" : "",    // ✅ match ChannelList selected theme
            ].join(" ")}
          >
            {programs.length === 0 ? (
              <div className="p-3 text-gray-300 flex items-center gap-2">
                {/* LIVE badge (blue themed) when selected + no current program + no programs */}
                {isSelected && !hasNow && (
                  <span className="epg-badge-live text-[10px] font-bold tracking-wide px-2 py-0.5 rounded">
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
                  showNowBadge={isSelected && p.__kind === "now"}
                  showLiveBadge={isSelected && !hasNow && idx === 0}
                  // ✅ lets ProgramCard match row hover/selected styling if you want
                  isSelectedRow={isSelected}
                />
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}
