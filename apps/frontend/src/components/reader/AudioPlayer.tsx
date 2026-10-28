import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { NATIVE_LANGUAGE_NAMES, isLanguage } from "../../lib/locale";
import { cn } from "../../utils/cn";

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
  const { t } = useTranslation();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);

  const languageName = isLanguage(language)
    ? NATIVE_LANGUAGE_NAMES[language]
    : language;

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
    // Eine Zeile: Abspielen, Position, Zeit, Tempo. Welche Sprache vorgelesen
    // wird, zeigt die Sprachwahl — hier nur als Name für Screenreader.
    <div
      role="group"
      aria-label={t("audio.label", { language: languageName })}
      className="flex items-center gap-3 w-full min-w-0"
    >
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

      <button
        type="button"
        aria-label={isPlaying ? t("audio.pause") : t("audio.play")}
        onClick={handlePlayPause}
        className={cn(
          "w-12 h-12 shrink-0 rounded-full flex items-center justify-center",
          "bg-[var(--color-primary)] text-[var(--color-on-primary)]",
          "transition-colors duration-200 hover:bg-[var(--color-primary-dark)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-primary-text)]",
        )}
      >
        {isPlaying ? (
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-5 h-5"
            aria-hidden="true"
          >
            <rect x="6" y="4.5" width="4" height="15" rx="1" />
            <rect x="14" y="4.5" width="4" height="15" rx="1" />
          </svg>
        ) : (
          // Abspielen zeigt auch auf Arabisch nach rechts (Medien-Symbole
          // spiegelt man nicht); leicht versetzt, damit es mittig wirkt
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-5 h-5 translate-x-px"
            aria-hidden="true"
          >
            <path d="M7 4.5v15l12-7.5z" />
          </svg>
        )}
      </button>

      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.01}
        value={currentTime}
        onChange={handleSeek}
        aria-label={t("audio.seek")}
        className="flex-1 min-w-0 h-11 cursor-pointer accent-[var(--color-primary)]"
      />

      <span
        className="hidden sm:inline text-sm tabular-nums shrink-0"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {formatTime(currentTime)} / {formatTime(duration)}
      </span>

      <select
        aria-label={t("audio.speed")}
        value={speed}
        onChange={handleSpeedChange}
        className={cn(
          // Schmal und ohne Pfeil: der Regler braucht auf dem Handy den Platz;
          // auf ganz kleinen Displays (iPhone SE) ganz ohne Tempo-Wahl
          "max-[359px]:hidden h-10 w-14 shrink-0 appearance-none rounded-xl px-0 text-center text-sm font-bold cursor-pointer",
          "bg-[var(--color-surface)] text-[var(--color-text-primary)]",
          "border-[1.5px] border-[var(--color-border)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-text)]",
        )}
      >
        {SPEED_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
