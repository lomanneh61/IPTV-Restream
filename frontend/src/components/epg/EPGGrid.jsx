
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

  // ✅ ONE scroll container for BOTH columns
  return (
    <div className="h-full bg-black text-white rounded-xl shadow-lg overflow-hidden">
      <div className="h-full overflow-y-auto overflow-x-auto">
        {/* Sticky header row */}
        <EPGTimeline.Header />

        {/* Grid body: two columns, scroll together */}
        <div className="grid grid-cols-[14rem_1fr]">
          <EPGChannelList channels={epgChannels} />
          <EPGTimeline channels={epgChannels} />
        </div>
      </div>
    </div>
  );
}

