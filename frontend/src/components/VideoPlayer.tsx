
import React, { useContext, useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { Channel, ChannelMode } from "../types";
import { ToastContext } from "./notifications/ToastContext";
import EPGGrid from "./epg/EPGGrid";

interface VideoPlayerProps {
  channel: Channel | null;
  syncEnabled: boolean;
}

function VideoPlayer({ channel, syncEnabled }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const { addToast, removeToast, clearToasts, editToast } = useContext(ToastContext);

  const [showEPG, setShowEPG] = useState(false);

  // ✅ Universal "do not navigate" handler (works for mouse, pointer, keyboard)
  const blockEvent = useCallback((e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Extra safety: stop native event bubbling too (helps in rare cases)
    // @ts-ignore
    if (e.nativeEvent?.stopImmediatePropagation) {
      // @ts-ignore
      e.nativeEvent.stopImmediatePropagation();
    }
  }, []);

  useEffect(() => {
    if (!videoRef.current || !channel?.url) return;
    const video = videoRef.current;

    const BACKEND = import.meta.env.VITE_BACKEND_URL || "";

    if (Hls.isSupported()) {
      if (hlsRef.current) hlsRef.current.destroy();

      const hls = new Hls({
        autoStartLoad: syncEnabled ? false : true,
        liveDurationInfinity: true,
        manifestLoadPolicy: {
          default: {
            maxTimeToFirstByteMs: Infinity,
            maxLoadTimeMs: 20000,
            timeoutRetry: { maxNumRetry: 3, retryDelayMs: 0, maxRetryDelayMs: 0 },
            errorRetry: {
              maxNumRetry: 12,
              retryDelayMs: 1000,
              maxRetryDelayMs: 8000,
              backoff: "linear",
              shouldRetry: (retryConfig, retryCount) => retryCount < retryConfig!.maxNumRetry,
            },
          },
        },
      });

      const sourceLinks: Record<ChannelMode, string> = {
        direct: channel.url,
        proxy: BACKEND + "/proxy/channel",
        restream: BACKEND + "/streams/" + channel.id + "/" + channel.id + ".m3u8",
      };

      hlsRef.current = hls;
      hls.loadSource(sourceLinks[channel.mode]);
      hls.attachMedia(video);

      if (!syncEnabled) return;

      clearToasts();
      let toastStartId: any = addToast({
        type: "loading",
        title: "Starting Stream",
        message: "This might take a few moments...",
        duration: 0,
      });

      const tolerance = import.meta.env.VITE_SYNCHRONIZATION_TOLERANCE || 0.8;
      const maxDeviation = import.meta.env.VITE_SYNCHRONIZATION_MAX_DEVIATION || 4;

      let toastDurationSet = false;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (channel.mode === "restream") {
          const now = new Date().getTime();
          const fragments = hls.levels[0]?.details?.fragments;
          const lastFragment = fragments?.[fragments.length - 1];

          if (!lastFragment || !lastFragment.programDateTime) return;

          const timeDiff = (now - lastFragment.programDateTime) / 1000;
          const videoLength = fragments.reduce((acc, fragment) => acc + fragment.duration, 0);
          const targetDelay: number = Number(import.meta.env.VITE_STREAM_DELAY);

          const timeTolerance = tolerance + 1;
          const delay: number = videoLength + timeDiff + timeTolerance;

          if (delay >= targetDelay) {
            hls.startLoad();
            video.play();
            if (!toastDurationSet && toastStartId) removeToast(toastStartId);
          } else {
            if (!toastDurationSet && toastStartId) {
              editToast(toastStartId, { duration: (1 + targetDelay - delay) * 1000 });
              toastDurationSet = true;
            }
            setTimeout(() => {
              hls.loadSource(BACKEND + "/streams/" + channel.id + "/" + channel.id + ".m3u8");
            }, 1000);
          }
        } else {
          hls.startLoad();
          video.play();
          if (toastStartId) removeToast(toastStartId);
        }
      });

      // ... your FRAG_LOADED + ERROR handlers unchanged ...
    }

    return () => {
      if (hlsRef.current) hlsRef.current.destroy();
    };
  }, [channel?.url, channel?.mode, syncEnabled]);

  const handleVideoClick = (event: React.MouseEvent<HTMLVideoElement>) => {
    if (videoRef.current?.muted) {
      event.preventDefault();
      videoRef.current.muted = false;
      videoRef.current.play();
    }
  };

  return (
    <div className="relative bg-gray-800 rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        className="w-full aspect-video bg-black"
        muted
        autoPlay
        playsInline
        controls
        onClick={handleVideoClick}
      />

      {/* Header area - stop bubbling to anything above */}
      <div
        className="flex items-center p-4 bg-gray-900 text-white"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <img
          src={channel?.avatar}
          alt={`${channel?.name} avatar`}
          className="w-10 h-10 object-contain mr-3"
        />
        <span className="font-medium">{channel?.name}</span>

        {/* ✅ EPG toggle button: blocks navigation at pointer + click + keyboard */}
        <button
          type="button"
          onPointerDown={blockEvent}
          onMouseDown={blockEvent}
          onClick={(e) => {
            blockEvent(e);
            setShowEPG((prev) => !prev);
          }}
          onKeyDown={(e) => {
            // Prevent Enter/Space from triggering any default submit/navigation behavior
            if (e.key === "Enter" || e.key === " ") {
              blockEvent(e);
              setShowEPG((prev) => !prev);
            }
          }}
          className="ml-auto px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-white"
        >
          {showEPG ? "Hide EPG" : "Show EPG"}
        </button>
      </div>

      {showEPG && (
        <div
          className="absolute left-0 right-0 bottom-0 h-[38%] bg-gray-950/95 border-t border-gray-700 z-50 overflow-auto"
          // Prevent clicks inside the drawer from bubbling and triggering any parent navigation
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 bg-gray-950/95 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
            <div className="font-semibold">EPG</div>

            {/* ✅ Close button hardened the same way */}
            <button
              type="button"
              onPointerDown={blockEvent}
              onMouseDown={blockEvent}
              onClick={(e) => {
                blockEvent(e);
                setShowEPG(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  blockEvent(e);
                  setShowEPG(false);
                }
