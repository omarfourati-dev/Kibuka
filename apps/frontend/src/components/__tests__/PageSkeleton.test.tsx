/**
 * TDD RED: Beim direkten Aufruf blieb die Bibliothek ~1,5 s komplett weiß,
 * während die Seite nachlud — jetzt ein Lade-Skelett mit Statusmeldung.
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageSkeleton } from "../PageSkeleton";

describe("PageSkeleton", () => {
  it("announces loading to screen readers", () => {
    render(<PageSkeleton />);
    expect(screen.getByRole("status")).toHaveAccessibleName("Wird geladen …");
  });

  it("draws square cover placeholders instead of a blank page", () => {
    const { container } = render(<PageSkeleton />);
    expect(container.querySelectorAll(".aspect-square").length).toBeGreaterThan(
      1,
    );
  });
});
