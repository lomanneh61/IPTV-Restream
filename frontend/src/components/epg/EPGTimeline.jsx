import EPGProgramCard from "./EPGProgramCard";

export default function EPGTimeline({ epg, channels }) {
  const programs = epg.programs;

  const startTime = new Date();
  startTime.setMinutes(0, 0, 0);

  const timeSlots = Array.from({ length: 6 }).map((_, i) => {
    const t = new Date(startTime.getTime() + i * 30 * 60000);
    return t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  });

  return (
    <div className="flex-1 overflow-auto relative">
      {/* Time Header */}
      <div className="sticky top-0 z-10 bg-neutral-900 border-b border-neutral-800 flex">
        {timeSlots.map(t => (
          <div
            key={t}
            className="w-48 text-center py-2 text-gray-300 text-sm border-r border-neutral-800"
          >
            {t}
          </div>
        ))}
      </div>

      {/* Program Rows */}
      {channels.map(ch => {
        const channelPrograms = programs.filter(
          p => p.$.channel === ch.epgId
        );

        return (
          <div key={ch.id} className="flex border-b border-neutral-800">
            {channelPrograms.map(p => (
              <EPGProgramCard key={p.$.start} program={p} />
            ))}
          </div>
        );
      })}
    </div>
  );
}
