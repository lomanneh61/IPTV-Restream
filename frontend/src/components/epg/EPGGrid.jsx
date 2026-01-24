
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

  // ✅ This is the scrollable header (right side only)
  const headerXRef = useRef(null);

  const timeSlots = useMemo(() => buildTimeSlots(), []);

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
    // fetch once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Sync highlight whenever the actual playing channel changes
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
    <div className="h-full bg-black text-white rounded-xl shadow-lg overflow-hidden">
      {/* ✅ ONE vertical scroll for the whole grid, NO horizontal scroll here */}
      <div className="h-full overflow-y-auto overflow-x-hidden">
        {/* ✅ Sticky header row */}
        <div className="sticky top-0 z-50 bg-neutral-900 border-b border-neutral-800">
          <div className="grid grid-cols-[14rem_1fr]">
            {/* Left header cell (fixed) */}
            <div className="w-[14rem] border-r border-neutral-800 py-2 px-3 text-sm text-gray-300 overflow-x-hidden">
              Channels
            </div>

            {/* Right header area: horizontal scroll ONLY here */}
            <div
              ref={headerXRef}
              className="overflow-x-auto overflow-y-hidden"
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

        {/* ✅ Body: left column never horizontal scrolls; right column scrolls horizontally */}
        <div className="grid grid-cols-[14rem_1fr]">
          {/* Left rail: pinned, never moves left/right */}
          <div className="w-[14rem] bg-neutral-900 border-r border-neutral-800 overflow-x-hidden">
            <EPGChannelList
              channels={epgChannels}
              selectedChannelId={selectedChannelId}
              onChannelSelected={onChannelSelected}
              onChannelSelectCheckPermission={onChannelSelectCheckPermission}
            />
          </div>

          {/* Right timeline: horizontal scroll ONLY here */}
          <div
            className="overflow-x-auto overflow-y-hidden"
            onScroll={(e) => {
              // Keep header aligned with timeline horizontal scroll
              if (headerXRef.current) {
                headerXRef.current.scrollLeft = e.currentTarget.scrollLeft;
              }
            }}
          >
            <div className="min-w-max epg-grid-lines">
              <EPGTimeline channels={epgChannels} selectedChannelId={selectedChannelId} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
