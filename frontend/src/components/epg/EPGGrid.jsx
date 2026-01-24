
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
        const data = await getEPG(24);
        if (mounted) setEpg(data);
      } catch (e) {
        if (mounted) setError(e?.message || "Failed to load EPG");
      }
    })();

    return () => { mounted = false; };
  }, []);

  if (error) {
    return <div className="text-red-400 p-4">EPG Error: {error}</div>;
  }

  if (!epg) {
    return <div className="text-gray-400 p-4">Loading EPG…</div>;
  }

  return (
    <div className="flex h-[600px] bg-black text-white overflow-hidden rounded-xl shadow-lg">
      <EPGChannelList channels={channels} />
      <EPGTimeline epg={epg} channels={channels} />
    </div>
  );
}
