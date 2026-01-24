
import { useEffect, useState } from "react";
import { getEPG } from "../../services/epg";
import EPGChannelList from "./EPGChannelList";
import EPGTimeline from "./EPGTimeline";
import { useSyncedVerticalScroll } from "./useSyncedScroll"; // your hook

export default function EPGGrid() {
  const [epg, setEpg] = useState(null);
  const [error, setError] = useState(null);
  const [selectedChannelId, setSelectedChannelId] = useState(null);

  const { leftRef, rightRef } = useSyncedVerticalScroll();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setError(null);
        const data = await getEPG(24);
        if (!mounted) return;

        setEpg(data);
        const first = data?.channels?.find((c) => c.matched) || data?.channels?.[0];
        setSelectedChannelId(first?.channelId ?? null);
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

  // ✅ EPGGrid wrapper (layout) is here:
  return (
    <div className="flex h-[600px] overflow-hidden bg-black text-white rounded-xl shadow-lg">

      {/* Left scroll container */}
      <div ref={leftRef} className="w-56 overflow-y-auto overflow-x-hidden bg-neutral-900 border-r border-neutral-800">
        <EPGChannelList
          channels={epgChannels}
          selectedChannelId={selectedChannelId}
          onSelectChannel={setSelectedChannelId}
        />
      </div>

      {/* Right scroll container */}
      <div ref={rightRef} className="flex-1 overflow-auto relative">
        <EPGTimeline channels={epgChannels} selectedChannelId={selectedChannelId} />
      </div>

    </div>
  );
}
