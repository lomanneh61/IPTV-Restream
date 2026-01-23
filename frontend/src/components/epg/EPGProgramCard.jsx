import { useState } from "react";
import EPGModal from "./EPGModal";

export default function EPGProgramCard({ program }) {
  const [open, setOpen] = useState(false);

  const start = new Date(program.$.start);
  const stop = new Date(program.$.stop);
  const duration = (stop - start) / 60000; // minutes

  const width = (duration / 30) * 192; // 192px per 30 min

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className="p-3 bg-neutral-800 hover:bg-neutral-700 transition cursor-pointer border-r border-neutral-900"
        style={{ width }}
      >
        <div className="font-semibold text-sm">{program.title?.[0]}</div>
        <div className="text-xs text-gray-400 line-clamp-2">
          {program.desc?.[0]}
        </div>
      </div>

      {open && <EPGModal program={program} onClose={() => setOpen(false)} />}
    </>
  );
}
