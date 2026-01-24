
import React, { useContext, useEffect, useRef, useState } from "react";
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

      // ... FRAG_LOADED + ERROR handlers unchanged ...
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
    // ✅ Stack vertically so drawer is UNDER the video, never overlay
    <div className="bg-gray-800 rounded-lg overflow-hidden flex flex-col">
      {/* Video */}
      <video
        ref={videoRef}
        className="w-full aspect-video bg-black"
        muted
        autoPlay
        playsInline
        controls
        onClick={handleVideoClick}
      />

      {/* Header */}
      <div className="flex items-center p-4 bg-gray-900 text-white">
        <img
          src={channel?.avatar}
          alt={`${channel?.name} avatar`}
          className="w-10 h-10 object-contain mr-3"
        />
        <span className="font-medium">{channel?.name}</span>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowEPG((prev) => !prev);
          }}
          className="ml-auto px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-white"
        >
          {showEPG ? "Hide EPG" : "Show EPG"}
        </button>
      </div>

      {/* ✅ Responsive drawer BELOW player */}
      {showEPG && (
        <div className="w-full bg-gray-950/95 border-t border-gray-700">
          <div className="bg-gray-950/95 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
            <div className="font-semibold text-white">EPG</div>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowEPG(false);
              }}
              className="px-2 py-1 rounded hover:bg-gray-800 text-white"
              aria-label="Close EPG"
            >
              ✕
            </button>
          </div>

          {/* ✅ Responsive height: 50vh, capped at 520px */}
          <div className="h-[50vh] max-h-[520px] min-h-[260px] p-3 overflow-hidden">
            <EPGGrid />
          </div>
        </div>
      )}
    </div>
  );
}

export default VideoPlayer;
