import { useEffect, useState } from "react";
import { getEPG } from "../../services/epg";
import EPGChannelList from "./EPGChannelList";
import EPGTimeline from "./EPGTimeline";

export default function EPGGrid({ channels }) {
  const [epg, setEpg] = useState(null);

  useEffect(() => {
    getEPG().then(setEpg);
  }, []);

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
