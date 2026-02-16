"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  getAudioState,
  subscribe,
  pauseAudio,
  resumeAudio,
  stopAudio,
} from "@/lib/audio-store";

function useAudioStore() {
  return useSyncExternalStore(subscribe, getAudioState, () => null);
}

export default function MiniPlayer() {
  const audio = useAudioStore();
  const ref = useRef<HTMLAudioElement>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);

  // Sync <audio> element with store state
  useEffect(() => {
    const el = ref.current;
    if (!el || !audio) return;

    if (audio.isPlaying) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [audio?.isPlaying, audio?.url]);

  // Load new source when url changes
  useEffect(() => {
    const el = ref.current;
    if (!el || !audio) return;

    if (el.src !== audio.url) {
      el.src = audio.url;
      el.load();
      if (audio.isPlaying) {
        el.play().catch(() => {});
      }
    }
  }, [audio?.url, audio?.isPlaying]);

  // Update volume
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  if (!audio) return null;

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gunpowder-900 border-t border-gunpowder-700 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
      <audio
        ref={ref}
        onTimeUpdate={() => {
          const el = ref.current;
          if (!el) return;
          setCurrentTime(el.currentTime);
          setDuration(el.duration || 0);
          setProgress(el.duration ? (el.currentTime / el.duration) * 100 : 0);
        }}
        onEnded={stopAudio}
      />

      {/* Progress bar (clickable) */}
      <div
        className="h-1 bg-gunpowder-700 cursor-pointer group"
        onClick={(e) => {
          const el = ref.current;
          if (!el || !el.duration) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const pct = (e.clientX - rect.left) / rect.width;
          el.currentTime = pct * el.duration;
        }}
      >
        <div
          className="h-full bg-gradient-to-r from-orange-500 to-rose-500 transition-[width] duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="max-w-[1200px] mx-auto px-4 py-2.5 flex items-center gap-4">
        {/* Play/Pause */}
        <button
          onClick={() => (audio.isPlaying ? pauseAudio() : resumeAudio())}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-r from-orange-500 to-rose-500 text-white hover:scale-105 transition-transform cursor-pointer border-none flex-shrink-0"
        >
          {audio.isPlaying ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="6,4 20,12 6,20" />
            </svg>
          )}
        </button>

        {/* Title + time */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{audio.title}</p>
          <p className="text-xs text-gunpowder-400">
            {fmt(currentTime)} / {duration ? fmt(duration) : "--:--"}
          </p>
        </div>

        {/* Volume Control */}
        <div className="flex items-center gap-2 flex-shrink-0 max-md:hidden">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="w-8 h-8 flex items-center justify-center rounded-full text-gunpowder-300 hover:text-white transition-colors cursor-pointer border-none"
          >
            {isMuted || volume === 0 ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : volume < 0.5 ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setVolume(v);
              if (v > 0) setIsMuted(false);
            }}
            className="w-20 h-1 accent-orange-500 cursor-pointer"
            style={{
              background: `linear-gradient(to right, rgb(249, 115, 22) 0%, rgb(249, 115, 22) ${(isMuted ? 0 : volume) * 100}%, rgb(55, 65, 81) ${(isMuted ? 0 : volume) * 100}%, rgb(55, 65, 81) 100%)`
            }}
          />
        </div>

        {/* Close */}
        <button
          onClick={stopAudio}
          className="w-8 h-8 flex items-center justify-center rounded-full text-gunpowder-400 hover:text-white hover:bg-gunpowder-700 transition-all cursor-pointer border-none flex-shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
