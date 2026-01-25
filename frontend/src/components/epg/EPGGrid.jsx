
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

  // Refs for syncing horizontal scroll
  const headerXRef = useRef(null);
  const bodyXRef = useRef(null);
  const bottomXRef = useRef(null);

  // Tooltip toggle for phone + close on outside click
  const [showLegend, setShowLegend] = useState(false);
  const legendRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!legendRef.current) return;
      if (!legendRef.current.contains(e.target)) setShowLegend(false);
    };

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("touchstart", onDocClick, { passive: true });

    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("touchstart", onDocClick);
    };
  }, []);

  // prevent scroll ping-pong
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
      {/* Vertical scroll only here */}
      <div className="h-full overflow-y-auto overflow-x-hidden">
        {/* ✅ Sticky header (BLUE THEME APPLIED HERE) */}
        <div className="sticky top-0 z-50 epg-blue-panel border-b epg-blue-border">
          <div className="grid grid-cols-[14rem_1fr]">
            {/* ✅ Channels header cell (BLUE THEME) */}
            <div className="w-[14rem] border-r epg-blue-border py-2 px-3 text-sm epg-blue-header-text overflow-x-hidden epg-blue-panel">
              Channels
            </div>

            {/* ✅ Time header row (BLUE THEME + HOVER) */}
            <div
              ref={headerXRef}
              className="overflow-x-auto overflow-y-hidden epg-hide-x-scrollbar"
              onScroll={(e) => syncX("header", e.currentTarget.scrollLeft)}
            >
              <div className="flex min-w-max">
                {timeSlots.map((t) => (
                  <div
                    key={t}
                    className={[
                      "w-48 text-center py-2 text-sm border-r transition",
                      "epg-blue-panel epg-blue-border",
                      "epg-blue-header-text",
                      "hover:bg-blue-500/10", // hover matches channel list vibe
                    ].join(" ")}
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
          {/* Left rail pinned (keep your existing styling OR swap to epg-blue-panel if you want) */}
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

        {/* Bottom scrollbar (visible) + minimal tooltip legend */}
        <div className="sticky bottom-0 z-50 bg-black border-t border-neutral-800">
          <div className="grid grid-cols-[14rem_1fr]">
            {/* Left area: Timeline label + info tooltip */}
            <div className="w-[14rem] border-r border-neutral-800 px-3 py-2 text-xs text-slate-400 flex items-center gap-2">
              <span>Timeline</span>

              <span ref={legendRef} className="relative inline-flex items-center group">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowLegend((v) => !v);
                  }}
                  className="w-5 h-5 flex items-center justify-center rounded-full bg-blue-500/10 text-blue-200 border border-blue-500/20 text-[11px] font-bold hover:bg-blue-500/20 transition"
                  aria-label="EPG legend"
                  aria-expanded={showLegend}
                >
                  i
                </button>

                {/* Tooltip: hover (desktop) OR click/tap (phone) */}
                <div
                  className={[
                    "absolute left-0 bottom-full mb-2 z-50",
                    "w-[280px] rounded-lg border border-blue-500/20 bg-slate-950/95 p-3 text-[12px] text-slate-200 shadow-xl",
                    showLegend ? "block" : "hidden group-hover:block",
                  ].join(" ")}
                >
                  <div className="font-semibold mb-2 text-blue-100">Legend</div>

                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold tracking-wide px-2 py-0.5 rounded border bg-green-600/20 text-green-200 border-green-500/30">
                      NOW
                    </span>
                    <span className="text-slate-300">Current program from EPG</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold tracking-wide px-2 py-0.5 rounded border bg-blue-600/20 text-blue-200 border-blue-500/30">
                      LIVE
                    </span>
                    <span className="text-slate-300">Live stream (no current program data)</span>
                  </div>
                </div>
              </span>
            </div>

            {/* Visible horizontal scrollbar */}
            <div
              ref={bottomXRef}
              className="overflow-x-auto overflow-y-hidden"
              onScroll={(e) => syncX("bottom", e.currentTarget.scrollLeft)}
            >
              {/* Ghost content gives scrollbar width (keep your working value) */}
              <div className="min-w-max h-4">
                <div className="w-[72rem] h-4" />
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
