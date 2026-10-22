/**
 * TDD RED: Werbefrei für Abonnenten und im Reader.
 * - Abonnenten: AdSense wird gar nicht erst geladen
 * - Solange der Abo-Status unbekannt ist: noch nicht laden (kein Flackern)
 * - Reader: keine Werbung; bereits geladene Auto-Anzeigen werden per
 *   body-Klasse ausgeblendet
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useAuthStore } from "@omarsapp/shared-stores";
import { AdSenseLoader, NO_ADS_CLASS } from "../AdSenseLoader";
import * as ads from "../../../lib/ads";

vi.mock("../../../lib/ads", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../lib/ads")>();
  return { ...actual, loadAds: vi.fn(() => true) };
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AdSenseLoader />
    </MemoryRouter>,
  );
}

function subscription(isActive: boolean) {
  return {
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({
        status: isActive ? "active" : "none",
        plan: isActive ? "monthly" : null,
        current_period_end: null,
        cancel_at_period_end: false,
        is_active: isActive,
      }),
  } as Response;
}

const SIGNED_IN = {
  user: {
    id: "u1",
    email: "o@example.com",
    name: "O",
    role: "member" as const,
  },
  isAuthenticated: true,
  accessToken: "tok",
};

describe("AdSenseLoader", () => {
  beforeEach(() => {
    vi.mocked(ads.loadAds).mockClear();
    vi.stubGlobal("fetch", vi.fn());
    document.body.classList.remove(NO_ADS_CLASS);
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      accessToken: null,
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("loads ads for anonymous visitors on browsing pages", async () => {
    renderAt("/");
    await waitFor(() => expect(ads.loadAds).toHaveBeenCalled());
    expect(document.body.classList.contains(NO_ADS_CLASS)).toBe(false);
    // Anonym: kein Abo-Abruf nötig
    expect(fetch).not.toHaveBeenCalled();
  });

  it("never loads ads for subscribers", async () => {
    useAuthStore.setState(SIGNED_IN);
    vi.mocked(fetch).mockResolvedValue(subscription(true));

    renderAt("/");

    await waitFor(() =>
      expect(document.body.classList.contains(NO_ADS_CLASS)).toBe(true),
    );
    expect(ads.loadAds).not.toHaveBeenCalled();
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/v1/billing/subscription/me");
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: "Bearer tok",
    });
  });

  it("waits for the subscription status before loading", () => {
    useAuthStore.setState(SIGNED_IN);
    vi.mocked(fetch).mockReturnValue(new Promise(() => {}));

    renderAt("/");

    expect(ads.loadAds).not.toHaveBeenCalled();
  });

  it("loads ads for signed-in users without a subscription", async () => {
    useAuthStore.setState(SIGNED_IN);
    vi.mocked(fetch).mockResolvedValue(subscription(false));

    renderAt("/library");

    await waitFor(() => expect(ads.loadAds).toHaveBeenCalled());
    expect(document.body.classList.contains(NO_ADS_CLASS)).toBe(false);
  });

  it("keeps the reader ad-free and hides already-loaded ads there", async () => {
    renderAt("/books/b1/read");

    await waitFor(() =>
      expect(document.body.classList.contains(NO_ADS_CLASS)).toBe(true),
    );
    expect(ads.loadAds).not.toHaveBeenCalled();
  });
});
