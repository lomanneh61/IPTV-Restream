
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
  const slotPx = 48 * 4; // w-48 = 12rem = 192px (12 * 16)
  const minTimelinePx = timeSlots.length * slotPx;

  // Horizontal scrollers
  const headerXRef = useRef(null);
  const bodyXRef = useRef(null);
  const bottomXRef = useRef(null);

  // Measure widths
  const headerContentRef = useRef(null);
  const timelineContentRef = useRef(null);

  const [xWidth, setXWidth] = useState(minTimelinePx);

  // Measure bottom scroller viewport width so we can force overflow
  const [bottomClientWidth, setBottomClientWidth] = useState(0);

  const syncingRef = useRef(false);

  const syncX = (source, left) => {
    if (syncingRef.current) return;
    syncingRef.current = true;

    if (source !== "header" && headerXRef.current) headerXRef.current.scrollLeft = left;
    if (source !== "body" && bodyXRef.current) bodyXRef.current.scrollLeft = left;
    if (source !== "bottom" && bottomXRef.current) bottomXRef.current.scrollLeft = left;

    requestAnimationFrame(() => {
      syncingRef.current = false;
    });
  };

  // Fetch EPG once
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

  // Sync highlight with actual playing channel
  useEffect(() => {
    if (!epg?.channels || currentChannelId == null) return;
    const exists = epg.channels.some((c) => c.channelId === currentChannelId);
    if (exists) setSelectedChannelId(currentChannelId);
  }, [currentChannelId, epg]);

  // Auto-adjust timeline width: max(header time width, timeline body width, minTimelinePx)
  useEffect(() => {
    const headerEl = headerContentRef.current;
    const timelineEl = timelineContentRef.current;

    if (!headerEl && !timelineEl) return;

    const compute = () => {
      const headerW = headerEl ? headerEl.scrollWidth : 0;
      const timelineW = timelineEl ? timelineEl.scrollWidth : 0;
      const next = Math.max(minTimelinePx, headerW, timelineW);
      setXWidth(next);
    };

    compute();

    const ro = new ResizeObserver(() => compute());
    if (headerEl) ro.observe(headerEl);
    if (timelineEl) ro.observe(timelineEl);

    const raf = requestAnimationFrame(compute);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [epg, minTimelinePx]);

  // Measure the bottom scroller viewport width so scrollbar always shows
  useEffect(() => {
    const el = bottomXRef.current;
    if (!el) return;

    const update = () => setBottomClientWidth(el.clientWidth || 0);
    update();

    const ro = new ResizeObserver(() => update());
    ro.observe(el);

    const raf = requestAnimationFrame(update);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [epg]);

  if (error) return <div className="text-red-400 p-4">EPG Error: {error}</div>;
  if (!epg) return <div className="text-gray-400 p-4">Loading EPG…</div>;

  const epgChannels = epg.channels || [];
  if (!epgChannels.length) {
    return <div className="text-gray-400 p-4">EPG loaded but returned 0 channels.</div>;
  }

  // Force bottom bar to always overflow at least by 1px
  const ghostWidth = Math.max(xWidth, bottomClientWidth + 1);

  return (
    <div className="h-full bg-black text-white rounded-xl shadow-lg overflow-hidden">
      {/* Vertical scroll only */}
      <div className="h-full overflow-y-auto overflow-x-hidden">
        {/* Sticky header */}
        <div className="sticky top-0 z-50 bg-neutral-900 border-b border-neutral-800">
          <div className="grid grid-cols-[14rem_1fr]">
            <div className="w-[14rem] border-r border-neutral-800 py-2 px-3 text-sm text-gray-300 overflow-x-hidden">
              Channels
            </div>

            {/* Header time row (hidden scrollbar, synced) */}
            <div
              ref={headerXRef}
              className="overflow-x-auto overflow-y-hidden epg-hide-x-scrollbar"
              onScroll={(e) => syncX("header", e.currentTarget.scrollLeft)}
            >
              <div ref={headerContentRef} className="flex min-w-max">
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

        {/* Body */}
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

          {/* Timeline (hidden scrollbar, synced) */}
          <div
            ref={bodyXRef}
            className="overflow-x-auto overflow-y-hidden epg-hide-x-scrollbar"
            onScroll={(e) => syncX("body", e.currentTarget.scrollLeft)}
          >
            <div
              ref={timelineContentRef}
              className="epg-grid-lines"
              style={{ minWidth: xWidth }}
            >
              <EPGTimeline channels={epgChannels} selectedChannelId={selectedChannelId} />
            </div>
          </div>
        </div>

        {/* Bottom scrollbar (VISIBLE + blue themed + auto-width) */}
        <div className="sticky bottom-0 z-50 bg-black border-t border-neutral-800 shadow-[0_-6px_16px_rgba(0,0,0,0.55)]">
          <div className="grid grid-cols-[14rem_1fr]">
            <div className="w-[14rem] border-r border-neutral-800 px-3 py-2 text-xs text-gray-400">
              Timeline
            </div>

            <div className="px-2 py-2">
              <div
                ref={bottomXRef}
                className="h-10 overflow-x-auto overflow-y-hidden scroll-container epg-bottom-scroll"
                onScroll={(e) => syncX("bottom", e.currentTarget.scrollLeft)}
              >
                {/* Ghost spacer: always wider than viewport so scrollbar is visible */}
                <div style={{ width: ghostWidth, height: 1 }} />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
