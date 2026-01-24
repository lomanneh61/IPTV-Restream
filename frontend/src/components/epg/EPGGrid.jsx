
import { useEffect, useState } from "react";
import { getEPG } from "../../services/epg";
import EPGChannelList from "./EPGChannelList";
import EPGTimeline from "./EPGTimeline";

export default function EPGGrid({ channels }) {
  const [epg, setEpg] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setError(null);
        const data = await getEPG(24); // optional hours param if you added it
        if (mounted) setEpg(data);
      } catch (e) {
        if (mounted) setError(e?.message || "Failed to load EPG");
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (error) {
    return <div className="text-red-400 p-4">EPG Error: {error}</div>;
  }

  if (!epg) {
    return <div className="text-gray-400 p-4">Loading EPG…</div>;
  }

  // ✅ backend returns { meta, channels, unmatched }
  const epgChannels = epg.channels || [];

  // We are showing EPG for the channels passed from VideoPlayer (often just 1)
  const requestedIds = new Set((channels || []).map((c) => c?.id).filter((v) => v !== undefined && v !== null));

  // Keep only EPG entries that match the selected channel(s)
  const mappedForRequested = epgChannels.filter((c) => requestedIds.has(c.channelId));

  return (
    <div
      className="flex h-[600px] bg-black text-white overflow-hidden rounded-xl shadow-lg"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <EPGChannelList channels={channels} />
      <EPGTimeline epgChannels={mappedForRequested} />
    </div>
  );
}

