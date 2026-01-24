
import { useEffect, useMemo, useState } from "react";
import { getEPG } from "../../services/epg";
import EPGChannelList from "./EPGChannelList";
import EPGTimeline from "./EPGTimeline";

export default function EPGGrid() {
  const [epg, setEpg] = useState(null);
  const [error, setError] = useState(null);
  const [selectedChannelId, setSelectedChannelId] = useState(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setError(null);
        const data = await getEPG(24);
        if (!mounted) return;

        setEpg(data);

        // Select the first matched channel by default (or first channel)
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

  const epgChannels = useMemo(() => epg?.channels || [], [epg]);

  if (error) {
    return <div className="text-red-400 p-4">EPG Error: {error}</div>;
  }

  if (!epg) {
    return <div className="text-gray-400 p-4">Loading EPG…</div>;
  }

  return (
    <div
      className="flex h-[600px] bg-black text-white overflow-hidden rounded-xl shadow-lg"
      // prevent bubbling up into any parent click handlers
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <EPGChannelList
        channels={epgChannels}
        selectedChannelId={selectedChannelId}
        onSelectChannel={(id) => setSelectedChannelId(id)}
      />

      <EPGTimeline
        channels={epgChannels}
        selectedChannelId={selectedChannelId}
      />
    </div>
  );
}
