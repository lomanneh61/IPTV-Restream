
import EPGProgramCard from "./EPGProgramCard";

export default function EPGTimeline({ channels, selectedChannelId }) {
  const startTime = new Date();
  startTime.setMinutes(0, 0, 0);

  const timeSlots = Array.from({ length: 6 }).map((_, i) => {
    const t = new Date(startTime.getTime() + i * 30 * 60000);
    return t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  });

  // Optional: if you want to show only the selected channel’s row
  // set this to channels.filter(...)
  const rows = channels;

  return (
    <div className="flex-1 overflow-auto relative">
      {/* Time Header */}
      <div className="sticky top-0 z-10 bg-neutral-900 border-b border-neutral-800 flex">
        {timeSlots.map((t) => (
          <div
            key={t}
            className="w-48 text-center py-2 text-gray-300 text-sm border-r border-neutral-800"
          >
            {t}
          </div>
        ))}
      </div>

      {/* Program Rows */}
      {rows.map((ch) => {
        const isSelected = ch.channelId === selectedChannelId;

        const programs = [
          ...(ch.now ? [{ ...ch.now, __kind: "now" }] : []),
          ...((ch.next || []).map((p) => ({ ...p, __kind: "next" }))),
        ];

        return (
          <div
            key={ch.channelId ?? ch.name}
            className={[
              "flex border-b border-neutral-800",
              isSelected ? "bg-neutral-900/40" : "",
            ].join(" ")}
          >
            {programs.length === 0 ? (
              <div className="p-4 text-gray-400">
                {ch.matched ? "No programs in range." : "No EPG match for this channel."}
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
``
