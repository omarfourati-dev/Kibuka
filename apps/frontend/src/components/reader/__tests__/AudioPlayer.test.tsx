import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AudioPlayer } from "../AudioPlayer";

// jsdom doesn't implement HTMLMediaElement fully — mock play/pause
beforeAll(() => {
  Object.defineProperty(HTMLMediaElement.prototype, "play", {
    configurable: true,
    value: vi.fn().mockResolvedValue(undefined),
    writable: true,
  });
  Object.defineProperty(HTMLMediaElement.prototype, "pause", {
    configurable: true,
    value: vi.fn(),
    writable: true,
  });
});

describe("AudioPlayer", () => {
  it("renders play button initially", () => {
    render(
      <AudioPlayer audioUrl="https://example.com/audio.mp3" language="de" />,
    );
    // Play button present (pause button should not be visible before playing)
    expect(screen.getByRole("button", { name: /play/i })).toBeInTheDocument();
  });

  it("renders audio element with correct src", () => {
    const { container } = render(
      <AudioPlayer audioUrl="https://example.com/audio.mp3" language="de" />,
    );
    const audio = container.querySelector("audio");
    expect(audio).toBeInTheDocument();
    expect(audio?.src).toBe("https://example.com/audio.mp3");
  });

  it("shows language label", () => {
    render(
      <AudioPlayer audioUrl="https://example.com/audio.mp3" language="de" />,
    );
    expect(screen.getByText("Deutsch")).toBeInTheDocument();
  });

  it("renders speed selector with options", () => {
    render(
      <AudioPlayer audioUrl="https://example.com/audio.mp3" language="de" />,
    );
    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "0.75x" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "1x" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "1.25x" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "1.5x" })).toBeInTheDocument();
  });

  it("calls onTimeUpdate with milliseconds on time update", () => {
    const onTimeUpdate = vi.fn();
    const { container } = render(
      <AudioPlayer
        audioUrl="https://example.com/audio.mp3"
        language="en"
        onTimeUpdate={onTimeUpdate}
      />,
    );
    const audio = container.querySelector("audio") as HTMLAudioElement;

    // Set currentTime to 1.5 seconds
    Object.defineProperty(audio, "currentTime", {
      value: 1.5,
      configurable: true,
    });
    fireEvent.timeUpdate(audio);

    expect(onTimeUpdate).toHaveBeenCalledWith(1500);
  });

  it("calls onEnded when audio ends", () => {
    const onEnded = vi.fn();
    const { container } = render(
      <AudioPlayer
        audioUrl="https://example.com/audio.mp3"
        language="en"
        onEnded={onEnded}
      />,
    );
    const audio = container.querySelector("audio") as HTMLAudioElement;
    fireEvent.ended(audio);
    expect(onEnded).toHaveBeenCalledTimes(1);
  });

  it("calls onPlay when play is clicked", () => {
    const onPlay = vi.fn();
    render(
      <AudioPlayer
        audioUrl="https://example.com/audio.mp3"
        language="en"
        onPlay={onPlay}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /play/i }));
    expect(onPlay).toHaveBeenCalledTimes(1);
  });

  it("shows Deutsch for de language", () => {
    render(
      <AudioPlayer audioUrl="https://example.com/audio.mp3" language="de" />,
    );
    expect(screen.getByText("Deutsch")).toBeInTheDocument();
  });

  it("shows العربية for ar language", () => {
    render(
      <AudioPlayer audioUrl="https://example.com/audio.mp3" language="ar" />,
    );
    expect(screen.getByText("العربية")).toBeInTheDocument();
  });
});
