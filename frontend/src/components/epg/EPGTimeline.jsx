
import EPGProgramCard from "./EPGProgramCard";

export default function EPGTimeline({ channels, selectedChannelId }) {
  return (
    <div className="min-w-max">
      {channels.map((ch) => {
        const programs = [
          ...(ch.now ? [{ ...ch.now, __kind: "now" }] : []),
          ...((ch.next || []).map((p) => ({ ...p, __kind: "next" }))),
        ];

        const isSelected =
          selectedChannelId != null && ch.channelId === selectedChannelId;

        return (
          <div
            key={ch.channelId ?? ch.name}
            className={[
              "h-20 flex border-b border-neutral-800",
              isSelected ? "bg-neutral-900/40 ring-1 ring-blue-500/40" : "",
            ].join(" ")}
          >
            {programs.length === 0 ? (
              <div className="p-3 text-gray-400">
                {ch.matched ? "No programs in range." : "No EPG match."}
              </div>
            ) : (
              programs.map((p) => (
                <EPGProgramCard
                  key={`${p.start || "no-start"}-${p.title || "no-title"}-${p.__kind}`}
                  program={p}
                  // ✅ NOW badge only for the selected channel’s current program
                  showNowBadge={isSelected && p.__kind === "now"}
                />
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}
