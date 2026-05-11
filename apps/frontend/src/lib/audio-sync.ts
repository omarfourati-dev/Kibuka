export interface WordTimestamp {
  word: string;
  startTime: number; // ms
  endTime: number; // ms
}

/**
 * Find which word is currently being spoken based on audio playback time.
 * Returns the index of the active word, or -1 if none.
 */
export function getActiveWordIndex(
  timestamps: WordTimestamp[],
  currentTimeMs: number,
): number {
  for (let i = 0; i < timestamps.length; i++) {
    const ts = timestamps[i];
    if (currentTimeMs >= ts.startTime && currentTimeMs <= ts.endTime) {
      return i;
    }
  }
  return -1;
}

/**
 * Split text into words preserving spaces, returning an array of word objects
 * with their positions. Used to render text with per-word highlighting.
 */
export function splitTextToWords(
  text: string,
): Array<{ word: string; index: number }> {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word, index) => ({ word, index }));
}
