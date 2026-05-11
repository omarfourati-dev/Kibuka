import { useRef, useState } from "react";
import { cn } from "../../utils/cn";

const LANGUAGE_LABELS: Record<string, string> = {
  de: "Deutsch",
  ar: "العربية",
  fr: "Français",
  en: "English",
};

const SPEED_OPTIONS = [
  { value: 0.75, label: "0.75x" },
  { value: 1, label: "1x" },
  { value: 1.25, label: "1.25x" },
  { value: 1.5, label: "1.5x" },
];

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

interface AudioPlayerProps {
  audioUrl: string;
  onTimeUpdate?: (currentTimeMs: number) => void;
  onEnded?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  autoPlay?: boolean;
  language: string;
}

export function AudioPlayer({
  audioUrl,
  onTimeUpdate,
  onEnded,
  onPlay,
  onPause,
  autoPlay = false,
  language,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);

  const languageLabel = LANGUAGE_LABELS[language] ?? language;

  function handlePlayPause() {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      onPause?.();
    } else {
      void audio.play();
      setIsPlaying(true);
      onPlay?.();
    }
  }

  function handleTimeUpdate() {
    const audio = audioRef.current;
    if (!audio) return;
    const timeSeconds = audio.currentTime;
    setCurrentTime(timeSeconds);
    onTimeUpdate?.(timeSeconds * 1000);
  }

  function handleEnded() {
    setIsPlaying(false);
    onEnded?.();
  }

  function handleLoadedMetadata() {
    const audio = audioRef.current;
    if (!audio) return;
    setDuration(audio.duration);
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = Number(e.target.value);
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  }

  function handleSpeedChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const audio = audioRef.current;
    const newSpeed = Number(e.target.value);
    setSpeed(newSpeed);
    if (audio) {
      audio.playbackRate = newSpeed;
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2 p-3 rounded-xl",
        "bg-[var(--color-surface)] shadow-sm",
      )}
    >
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        autoPlay={autoPlay}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Language label + speed */}
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-semibold"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {languageLabel}
        </span>

        <select
          aria-label="Playback speed"
          value={speed}
          onChange={handleSpeedChange}
          className={cn(
            "text-xs rounded px-1 py-0.5",
            "bg-[var(--color-surface-raised)] border border-[var(--color-border)]",
          )}
        >
          {SPEED_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Progress bar */}
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.01}
        value={currentTime}
        onChange={handleSeek}
        aria-label="Seek"
        className="w-full accent-[var(--color-primary)]"
      />

      {/* Controls row */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={isPlaying ? "Pause" : "Play"}
          onClick={handlePlayPause}
          className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center",
            "bg-[var(--color-primary)] text-white",
            "hover:opacity-90 transition-opacity",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
          )}
        >
          {isPlaying ? (
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-4 h-4"
              aria-hidden="true"
            >
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-4 h-4"
              aria-hidden="true"
            >
              <polygon points="5,3 19,12 5,21" />
            </svg>
          )}
        </button>

        {/* Time display */}
        <span
          className="text-xs tabular-nums"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}
