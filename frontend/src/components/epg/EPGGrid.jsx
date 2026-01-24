
import { useEffect, useState } from "react";
import { getEPG } from "../../services/epg";
import EPGChannelList from "./EPGChannelList";
import EPGTimeline from "./EPGTimeline";

export default function EPGGrid() {
  const [epg, setEpg] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setError(null);
        const data = await getEPG(24);
        if (!mounted) return;
        setEpg(data);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Failed to load EPG");
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (error) return <div className="text-red-400 p-4">EPG Error: {error}</div>;
  if (!epg) return <div className="text-gray-400 p-4">Loading EPG…</div>;

  const epgChannels = epg.channels || [];
  if (!epgChannels.length) {
    return <div className="text-gray-400 p-4">EPG loaded but returned 0 channels.</div>;
  }

  return (
    <div className="h-full bg-black text-white rounded-xl shadow-lg overflow-hidden">
      {/* ✅ ONE scroll container controls vertical + horizontal */}
      <div className="h-full overflow-y-auto overflow-x-auto">
        {/* Sticky header row */}
        <div className="sticky top-0 z-50">
          {/* Wrap header in a 2-col grid so left cell can be sticky */}
          <div className="grid grid-cols-[14rem_1fr] bg-neutral-900 border-b border-neutral-800">
            {/* ✅ Sticky left header cell */}
            <div className="sticky left-0 z-50 bg-neutral-900 border-r border-neutral-800 py-2 px-3 text-sm text-gray-300">
              Channels
            </div>

            {/* Right header row (from your component) */}
            <div className="min-w-max">
              <EPGTimeline.Header />
            </div>
          </div>
        </div>

        {/* Grid body */}
        <div className="grid grid-cols-[14rem_1fr]">
          {/* ✅ Sticky left column: does NOT move horizontally */}
          <div className="sticky left-0 z-40 bg-neutral-900">
            <EPGChannelList channels={epgChannels} />
          </div>

          {/* Timeline column: horizontally scrollable content */}
          <div className="min-w-max">
            <EPGTimeline channels={epgChannels} />
          </div>
        </div>
      </div>
    </div>
  );
}
