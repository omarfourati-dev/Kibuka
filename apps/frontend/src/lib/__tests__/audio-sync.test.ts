import { describe, it, expect } from "vitest";
import {
  getActiveWordIndex,
  splitTextToWords,
  type WordTimestamp,
} from "../audio-sync";

describe("getActiveWordIndex", () => {
  const timestamps: WordTimestamp[] = [
    { word: "Hello", startTime: 0, endTime: 500 },
    { word: "world", startTime: 600, endTime: 1100 },
    { word: "foo", startTime: 1200, endTime: 1800 },
  ];

  it("returns index of word at current time", () => {
    expect(getActiveWordIndex(timestamps, 300)).toBe(0);
    expect(getActiveWordIndex(timestamps, 800)).toBe(1);
    expect(getActiveWordIndex(timestamps, 1500)).toBe(2);
  });

  it("returns -1 when time is before first word", () => {
    expect(getActiveWordIndex(timestamps, -100)).toBe(-1);
  });

  it("returns -1 when time is after last word", () => {
    expect(getActiveWordIndex(timestamps, 2000)).toBe(-1);
  });

  it("returns -1 for empty timestamps", () => {
    expect(getActiveWordIndex([], 500)).toBe(-1);
  });

  it("returns correct index when time is at word boundary (startTime)", () => {
    // At exactly startTime, the word should be active
    expect(getActiveWordIndex(timestamps, 0)).toBe(0);
    expect(getActiveWordIndex(timestamps, 600)).toBe(1);
    expect(getActiveWordIndex(timestamps, 1200)).toBe(2);
  });

  it("returns correct index when time is at word boundary (endTime)", () => {
    // At exactly endTime, the word should still be active
    expect(getActiveWordIndex(timestamps, 500)).toBe(0);
    expect(getActiveWordIndex(timestamps, 1100)).toBe(1);
    expect(getActiveWordIndex(timestamps, 1800)).toBe(2);
  });

  it("returns -1 in gap between words", () => {
    // Between word 0 endTime (500) and word 1 startTime (600)
    expect(getActiveWordIndex(timestamps, 550)).toBe(-1);
  });
});

describe("splitTextToWords", () => {
  it("splits simple text into words with indices", () => {
    const result = splitTextToWords("Hello world");
    expect(result).toEqual([
      { word: "Hello", index: 0 },
      { word: "world", index: 1 },
    ]);
  });

  it("handles multiple spaces between words", () => {
    const result = splitTextToWords("foo   bar   baz");
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ word: "foo", index: 0 });
    expect(result[1]).toEqual({ word: "bar", index: 1 });
    expect(result[2]).toEqual({ word: "baz", index: 2 });
  });

  it("filters empty strings", () => {
    const result = splitTextToWords("   ");
    expect(result).toHaveLength(0);
  });

  it("handles single word", () => {
    const result = splitTextToWords("Kibuka");
    expect(result).toEqual([{ word: "Kibuka", index: 0 }]);
  });

  it("handles empty string", () => {
    const result = splitTextToWords("");
    expect(result).toHaveLength(0);
  });
});
