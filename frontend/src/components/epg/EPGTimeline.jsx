
import EPGProgramCard from "./EPGProgramCard";

function buildTimeSlots() {
  const startTime = new Date();
  startTime.setMinutes(0, 0, 0);

  return Array.from({ length: 6 }).map((_, i) => {
    const t = new Date(startTime.getTime() + i * 30 * 60000);
    return t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  });
}

// ✅ Sticky header component
function Header() {
  const timeSlots = buildTimeSlots();

  return (
    <div className="sticky top-0 z-40 bg-neutral-900 border-b border-neutral-800 grid grid-cols-[14rem_1fr]">
      {/* Left header cell (will be made sticky in EPGGrid wrapper) */}
      <div className="border-r border-neutral-800 py-2 px-3 text-sm text-gray-300">
        Channels
      </div>

      {/* Right header row */}
      <div className="flex min-w-max">
        {timeSlots.map((t) => (
          <div
            key={t}
            className="w-48 text-center py-2 text-gray-300 text-sm border-r border-neutral-800"
          >
            {t}
          </div>
        ))}
      </div>
    </div>
  );
}

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

// attach Header as a static property for convenience
EPGTimeline.Header = Header;
EPGTimeline.Header.displayName = "EPGTimelineHeader";

