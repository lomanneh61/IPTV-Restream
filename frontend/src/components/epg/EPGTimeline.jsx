import EPGProgramCard from "./EPGProgramCard";

export default function EPGTimeline({ channels }) {
  return (
    // ✅ min-w-max ensures timeline can exceed container width (horizontal scroll)
    <div className="min-w-max">
      {channels.map((ch) => {
        const programs = [
          ...(ch.now ? [{ ...ch.now, __kind: "now" }] : []),
          ...((ch.next || []).map((p) => ({ ...p, __kind: "next" }))),
        ];

        return (
          <div
            key={ch.channelId ?? ch.name}
            className="h-20 flex border-b border-neutral-800"
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
                />
              ))
            )}
          </div>
        );
      })}
    </div>
  );
}
