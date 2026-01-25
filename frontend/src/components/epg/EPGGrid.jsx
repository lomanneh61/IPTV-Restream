
import { useEffect, useMemo, useRef, useState } from "react";
import { getEPG } from "../../services/epg";
import EPGChannelList from "./EPGChannelList";
import EPGTimeline from "./EPGTimeline";

function buildTimeSlots() {
  const startTime = new Date();
  startTime.setMinutes(0, 0, 0);

  return Array.from({ length: 6 }).map((_, i) => {
    const t = new Date(startTime.getTime() + i * 30 * 60000);
    return t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  });
}

export default function EPGGrid({
  currentChannelId = null,
  onChannelSelected = () => {},
  onChannelSelectCheckPermission = undefined,
} = {}) {
  const [epg, setEpg] = useState(null);
  const [error, setError] = useState(null);
  const [selectedChannelId, setSelectedChannelId] = useState(null);

  const timeSlots = useMemo(() => buildTimeSlots(), []);

  // ✅ Refs for syncing horizontal scroll
  const headerXRef = useRef(null);   // time labels
  const bodyXRef = useRef(null);     // timeline cards
  const bottomXRef = useRef(null);   // visible scrollbar at bottom

  // prevent scroll ping-pong
  const syncingRef = useRef(false);

  const syncX = (source, left) => {
    if (syncingRef.current) return;
    syncingRef.current = true;

    if (source !== "header" && headerXRef.current) headerXRef.current.scrollLeft = left;
    if (source !== "body" && bodyXRef.current) bodyXRef.current.scrollLeft = left;
    if (source !== "bottom" && bottomXRef.current) bottomXRef.current.scrollLeft = left;

    // release lock next frame
    requestAnimationFrame(() => {
      syncingRef.current = false;
    });
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setError(null);
        const data = await getEPG(24);
        if (!mounted) return;

        setEpg(data);

        const list = data?.channels || [];
        const preferred =
          (currentChannelId != null && list.find((c) => c.channelId === currentChannelId)) ||
          list.find((c) => c.matched) ||
          list[0];

        setSelectedChannelId(preferred?.channelId ?? null);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Failed to load EPG");
      }
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync selection whenever the actual playing channel changes
  useEffect(() => {
    if (!epg?.channels || currentChannelId == null) return;
    const exists = epg.channels.some((c) => c.channelId === currentChannelId);
    if (exists) setSelectedChannelId(currentChannelId);
  }, [currentChannelId, epg]);

  if (error) return <div className="text-red-400 p-4">EPG Error: {error}</div>;
  if (!epg) return <div className="text-gray-400 p-4">Loading EPG…</div>;

  const epgChannels = epg.channels || [];
  if (!epgChannels.length) {
    return <div className="text-gray-400 p-4">EPG loaded but returned 0 channels.</div>;
  }

  return (
    <div className="h-full text-white rounded-xl shadow-lg overflow-hidden epg-blue-surface">
      {/* ✅ Vertical scroll only here */}
      <div className="h-full overflow-y-auto overflow-x-hidden">
        {/* ✅ Sticky header */}
        <div className="sticky top-0 z-50 bg-neutral-900 border-b border-neutral-800">
          <div className="grid grid-cols-[14rem_1fr]">
            <div className="w-[14rem] border-r border-neutral-800 py-2 px-3 text-sm text-gray-300 overflow-x-hidden">
              Channels
            </div>

            {/* Header time row: horizontal scroll hidden (follows body/bottom) */}
            <div
              ref={headerXRef}
              className="overflow-x-auto overflow-y-hidden epg-hide-x-scrollbar"
              onScroll={(e) => syncX("header", e.currentTarget.scrollLeft)}
            >
              <div className="flex min-w-max">
                {timeSlots.map((t) => (
                  <div
                    key={t}
                    className="w-48 text-center py-2 text-gray-300 text-sm border-r border-neutral-800"
                  >
                    {t}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ✅ Body */}
        <div className="grid grid-cols-[14rem_1fr]">
          {/* Left rail pinned */}
          <div className="w-[14rem] bg-neutral-900 border-r border-neutral-800 overflow-x-hidden">
            <EPGChannelList
              channels={epgChannels}
              selectedChannelId={selectedChannelId}
              onChannelSelected={onChannelSelected}
              onChannelSelectCheckPermission={onChannelSelectCheckPermission}
            />
          </div>

          {/* Timeline: horizontal scroll hidden (follows bottom bar) */}
          <div
            ref={bodyXRef}
            className="overflow-x-auto overflow-y-hidden epg-hide-x-scrollbar"
            onScroll={(e) => syncX("body", e.currentTarget.scrollLeft)}
          >
            <div className="min-w-max epg-grid-lines">
              <EPGTimeline channels={epgChannels} selectedChannelId={selectedChannelId} />
            </div>
          </div>
        </div>

        {/* ✅ Bottom scrollbar (visible) */}
        <div className="sticky bottom-0 z-50 bg-black border-t border-neutral-800">
          <div className="grid grid-cols-[14rem_1fr]">
            {/* left spacer to align */}
            <div className="w-[14rem] border-r border-neutral-800" />

            {/* visible horizontal scrollbar */}
            <div
              ref={bottomXRef}
              className="overflow-x-auto overflow-y-hidden"
              onScroll={(e) => syncX("bottom", e.currentTarget.scrollLeft)}
            >
              {/* This “ghost” content gives the scrollbar the same width as the timeline */}
              <div className="min-w-max h-4">
                {/* match timeline width: 6 * w-48 (72rem) minimum,
                    but timeline may be wider if you later add more slots */}
                <div className="w-[72rem] h-4" />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
