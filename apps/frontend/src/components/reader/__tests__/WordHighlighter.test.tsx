import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WordHighlighter } from "../WordHighlighter";
import type { WordTimestamp } from "../../../lib/audio-sync";

const sampleTimestamps: WordTimestamp[] = [
  { word: "Hello", startTime: 0, endTime: 500 },
  { word: "beautiful", startTime: 600, endTime: 1100 },
  { word: "world", startTime: 1200, endTime: 1800 },
];

describe("WordHighlighter", () => {
  it("renders all words from text", () => {
    render(
      <WordHighlighter
        text="Hello beautiful world"
        timestamps={sampleTimestamps}
        currentTimeMs={0}
        language="en"
      />,
    );
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("beautiful")).toBeInTheDocument();
    expect(screen.getByText("world")).toBeInTheDocument();
  });

  it("highlights current word at given time", () => {
    render(
      <WordHighlighter
        text="Hello beautiful world"
        timestamps={sampleTimestamps}
        currentTimeMs={650}
        language="en"
      />,
    );
    const activeWord = screen.getByText("beautiful");
    expect(activeWord.className).toMatch(/word-highlight-active/);
  });

  it("does not highlight any word when time is -1 or before first word", () => {
    const { container } = render(
      <WordHighlighter
        text="Hello beautiful world"
        timestamps={sampleTimestamps}
        currentTimeMs={-1}
        language="en"
      />,
    );
    const activeWords = container.querySelectorAll(".word-highlight-active");
    expect(activeWords.length).toBe(0);
  });

  it("applies past style to words before current word", () => {
    const { container } = render(
      <WordHighlighter
        text="Hello beautiful world"
        timestamps={sampleTimestamps}
        currentTimeMs={1300}
        language="en"
      />,
    );
    // "Hello" and "beautiful" are past, "world" is active
    const pastWords = container.querySelectorAll(".word-highlight-past");
    expect(pastWords.length).toBe(2);
    expect(pastWords[0].textContent).toBe("Hello");
    expect(pastWords[1].textContent).toBe("beautiful");
  });

  it("has correct dir attribute for Arabic", () => {
    const { container } = render(
      <WordHighlighter
        text="مرحبا بالعالم"
        timestamps={[]}
        currentTimeMs={0}
        language="ar"
      />,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.getAttribute("dir")).toBe("rtl");
  });

  it("has correct dir attribute for German", () => {
    const { container } = render(
      <WordHighlighter
        text="Hallo Welt"
        timestamps={[]}
        currentTimeMs={0}
        language="de"
      />,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.getAttribute("dir")).toBe("ltr");
  });

  it("renders with no timestamps gracefully", () => {
    render(
      <WordHighlighter
        text="Hello beautiful world"
        timestamps={[]}
        currentTimeMs={500}
        language="en"
      />,
    );
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("beautiful")).toBeInTheDocument();
    expect(screen.getByText("world")).toBeInTheDocument();
  });

  it("highlights change when currentTimeMs changes", () => {
    const { rerender } = render(
      <WordHighlighter
        text="Hello beautiful world"
        timestamps={sampleTimestamps}
        currentTimeMs={50}
        language="en"
      />,
    );
    expect(screen.getByText("Hello").className).toMatch(
      /word-highlight-active/,
    );

    rerender(
      <WordHighlighter
        text="Hello beautiful world"
        timestamps={sampleTimestamps}
        currentTimeMs={650}
        language="en"
      />,
    );
    expect(screen.getByText("Hello").className).toMatch(/word-highlight-past/);
    expect(screen.getByText("beautiful").className).toMatch(
      /word-highlight-active/,
    );
  });
});
