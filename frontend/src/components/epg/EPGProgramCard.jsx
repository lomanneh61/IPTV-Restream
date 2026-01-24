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
  <div className="w-48 h-20 p-3 border-r border-neutral-800 hover:bg-neutral-900 transition overflow-hidden">
    ...
  </div>
);
}
