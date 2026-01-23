import React, { useContext, useEffect, useRef, useState } from 'react';   // ⭐ added useState
import Hls from 'hls.js';
import { Channel, ChannelMode } from '../types';
import { ToastContext } from './notifications/ToastContext';

// ⭐ import your EPG grid
import EPGGrid from './epg/EPGGrid';

interface VideoPlayerProps {
  channel: Channel | null;
  syncEnabled: boolean;
}

function VideoPlayer({ channel, syncEnabled }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const { addToast, removeToast, clearToasts, editToast } = useContext(ToastContext);

  // ⭐ EPG toggle state
  const [showEPG, setShowEPG] = useState(false);

  useEffect(() => {
    if (!videoRef.current || !channel?.url) return;
    const video = videoRef.current;

    if (Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }

      const hls = new Hls({
        autoStartLoad: syncEnabled ? false : true,
        liveDurationInfinity: true,
        manifestLoadPolicy: {
          default: {
            maxTimeToFirstByteMs: Infinity,
            maxLoadTimeMs: 20000,
            timeoutRetry: {
              maxNumRetry: 3,
              retryDelayMs: 0,
              maxRetryDelayMs: 0,
            },
            errorRetry: {
              maxNumRetry: 12,
              retryDelayMs: 1000,
              maxRetryDelayMs: 8000,
              backoff: 'linear',
              shouldRetry: (retryConfig, retryCount) =>
                retryCount < retryConfig!.maxNumRetry
            },
          },
        },
      });

      const sourceLinks: Record<ChannelMode, string> = {
        direct: channel.url,
        proxy: import.meta.env.VITE_BACKEND_URL + '/proxy/channel',
        restream:
          import.meta.env.VITE_BACKEND_URL +
          '/streams/' +
          channel.id +
          '/' +
          channel.id +
          '.m3u8',
      };

      hlsRef.current = hls;
      hls.loadSource(sourceLinks[channel.mode]);
      hls.attachMedia(video);

      if (!syncEnabled) return;

      clearToasts();
      let toastStartId = null;
      toastStartId = addToast({
        type: 'loading',
        title: 'Starting Stream',
        message: 'This might take a few moments...',
        duration: 0,
      });

      const tolerance = import.meta.env.VITE_SYNCHRONIZATION_TOLERANCE || 0.8;
      const maxDeviation = import.meta.env.VITE_SYNCHRONIZATION_MAX_DEVIATION || 4;

      let toastDurationSet = false;
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (channel.mode === 'restream') {
          const now = new Date().getTime();

          const fragments = hls.levels[0]?.details?.fragments;
          const lastFragment = fragments?.[fragments.length - 1];
          if (!lastFragment || !lastFragment.programDateTime) {
            console.warn('No program date time found in fragment. Cannot synchronize.');
            return;
          }

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
              editToast(toastStartId, {
                duration: (1 + targetDelay - delay) * 1000,
              });
              toastDurationSet = true;
            }

            setTimeout(() => {
              hls.loadSource(
                import.meta.env.VITE_BACKEND_URL +
                  '/streams/' +
                  channel.id +
                  '/' +
                  channel.id +
                  '.m3u8'
              );
            }, 1000);
          }
        } else {
          hls.startLoad();
          video.play();
          if (toastStartId) removeToast(toastStartId);
        }
      });

      let timeMissingErrorShown = false;
      hls.on(Hls.Events.FRAG_LOADED, (_event, data) => {
        const now = new Date().getTime();
        const newFrag = data.frag;

        if (!newFrag.programDateTime) {
          if (!timeMissingErrorShown) {
            addToast({
              type: 'error',
              title: 'Synchronization Error',
              message: `Playback can't be synchronized for this channel in ${channel.mode}. Change to restream mode and try again.`,
              duration: 5000,
            });
            timeMissingErrorShown = true;
          }
          return;
        }

        const timeDiff = (now - newFrag.programDateTime) / 1000;
        const videoDiff = newFrag.end - video.currentTime;
        const delay = timeDiff + videoDiff;

        const targetDelay =
          channel.mode == 'restream'
            ? import.meta.env.VITE_STREAM_DELAY
            : import.meta.env.VITE_STREAM_PROXY_DELAY;

        const deviation = delay - targetDelay;

        if (Math.abs(deviation) > maxDeviation) {
          video.currentTime += deviation;
          video.playbackRate = 1.0;
        } else if (Math.abs(deviation) > tolerance) {
          const adjustmentFactor =
            import.meta.env.VITE_SYNCHRONIZATION_ADJUSTMENT || 0.06;
          const speedAdjustment =
            1 +
            Math.sign(deviation) *
              Math.min(
                Math.abs(adjustmentFactor * deviation),
                import.meta.env.VITE_SYNCHRONIZATION_MAX_ADJUSTMENT || 0.16
              );
          video.playbackRate = speedAdjustment;
        } else {
          video.playbackRate = 1.0;
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          if (toastStartId) removeToast(toastStartId);

          const messages: Record<ChannelMode, string> = {
            direct:
              'The stream is not working. Try with proxy/restream option enabled for this channel.',
            proxy:
              'The stream is not working. Try with restream option enabled for this channel.',
            restream: `The stream is not working. Check the source. ${data.response?.text}`,
          };

          addToast({
            type: 'error',
            title: 'Stream Error',
            message: messages[channel.mode],
            duration: 5000,
          });
        }
      });
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

      {/* Channel header */}
      <div className="flex items-center p-4 bg-gray-900 text-white">
        <img
          src={channel?.avatar}
          alt={`${channel?.name} avatar`}
          className="w-10 h-10 object-contain mr-3"
        />
        <span className="font-medium">{channel?.name}</span>

        {/* ⭐ EPG toggle button */}
        <button
          onClick={() => setShowEPG(prev => !prev)}
          className="ml-auto px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-white"
        >
          {showEPG ? 'Hide EPG' : 'Show EPG'}
        </button>
      </div>

      {/* ⭐ EPG Grid */}
      {showEPG && (
        <div className="mt-4">
          <EPGGrid channels={[channel]} />
        </div>
      )}
    </div>
  );
}

export default VideoPlayer;
