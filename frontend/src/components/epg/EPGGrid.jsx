
import { useEffect, useState } from "react";
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
        const data = await getEPG(24); // hours
        if (!mounted) return;

        setEpg(data);

        // Pick a sensible default selection
        const first = data?.channels?.find((c) => c.matched) || data?.channels?.[0];
        setSelectedChannelId(first?.channelId ?? null);

        // Debug (remove later)
        console.log("EPG payload:", data);
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
    return (
      <div className="text-gray-400 p-4">
        EPG loaded, but returned 0 channels. Check backend mapping.
      </div>
    );
  }

  return (
    <div className="flex h-[600px] bg-black text-white overflow-hidden rounded-xl shadow-lg">
      <EPGChannelList
        channels={epgChannels}
        selectedChannelId={selectedChannelId}
        onSelectChannel={setSelectedChannelId}
      />
      <EPGTimeline
        channels={epgChannels}
        selectedChannelId={selectedChannelId}
      />
    </div>
  );
}

