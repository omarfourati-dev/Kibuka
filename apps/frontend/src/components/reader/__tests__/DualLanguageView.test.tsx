import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DualLanguageView } from "../DualLanguageView";
import type { WordTimestamp } from "../../../lib/audio-sync";

const timestamps: WordTimestamp[] = [
  { word: "Hello", startTime: 0, endTime: 500 },
  { word: "world", startTime: 600, endTime: 1200 },
];

describe("DualLanguageView", () => {
  it("renders primary and secondary text", () => {
    render(
      <DualLanguageView
        primaryLanguage="de"
        secondaryLanguage="ar"
        primaryText="Hallo Welt"
        secondaryText="مرحبا بالعالم"
      />,
    );
    expect(screen.getByText("Hallo")).toBeInTheDocument();
    expect(screen.getByText("Welt")).toBeInTheDocument();
    expect(screen.getByText("مرحبا")).toBeInTheDocument();
    expect(screen.getByText("بالعالم")).toBeInTheDocument();
  });

  it("primary text has correct dir", () => {
    const { container } = render(
      <DualLanguageView
        primaryLanguage="de"
        secondaryLanguage="ar"
        primaryText="Hallo Welt"
        secondaryText="مرحبا بالعالم"
      />,
    );
    // The primary panel should have dir=ltr
    const ltrEl = container.querySelector("[dir='ltr']");
    expect(ltrEl).toBeInTheDocument();
  });

  it("secondary text has correct dir", () => {
    const { container } = render(
      <DualLanguageView
        primaryLanguage="de"
        secondaryLanguage="ar"
        primaryText="Hallo Welt"
        secondaryText="مرحبا بالعالم"
      />,
    );
    // The secondary Arabic panel should have dir=rtl
    const rtlEl = container.querySelector("[dir='rtl']");
    expect(rtlEl).toBeInTheDocument();
  });

  it("highlights word in primary text when timestamps provided", () => {
    const { container } = render(
      <DualLanguageView
        primaryLanguage="en"
        secondaryLanguage="de"
        primaryText="Hello world"
        secondaryText="Hallo Welt"
        timestamps={timestamps}
        currentTimeMs={50}
      />,
    );
    const activeWords = container.querySelectorAll(".word-highlight-active");
    expect(activeWords.length).toBeGreaterThan(0);
    expect(activeWords[0].textContent).toBe("Hello");
  });
  it("names the second language in its own script, so parents know which is which", () => {
    render(
      <DualLanguageView
        primaryLanguage="de"
        secondaryLanguage="ar"
        primaryText="Hallo Welt"
        secondaryText="مرحبا بالعالم"
      />,
    );
    const label = screen.getByText("العربية");
    expect(label).toHaveAttribute("lang", "ar");
  });
});
