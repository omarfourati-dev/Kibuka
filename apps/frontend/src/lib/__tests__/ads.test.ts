import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ADSENSE_CLIENT,
  ADSENSE_HOST,
  CONSENT_COOKIES,
  adsAllowedOn,
  loadAds,
  resetAdConsent,
} from "../ads";

type AdsWindow = Window & {
  adsbygoogle?: unknown[] & { requestNonPersonalizedAds?: number };
};

function adScripts() {
  return [...document.head.querySelectorAll("script")].filter((s) =>
    s.src.includes("googlesyndication"),
  );
}

afterEach(() => {
  adScripts().forEach((s) => s.remove());
  delete (window as AdsWindow).adsbygoogle;
});

describe("adsAllowedOn", () => {
  it("allows the browsing views with content", () => {
    for (const path of [
      "/",
      "/library",
      "/books",
      "/books/42",
      "/pricing",
      "/profile",
      "/landing",
    ]) {
      expect(adsAllowedOn(path)).toBe(true);
    }
  });

  it("keeps the reader free of ads — children read there", () => {
    expect(adsAllowedOn("/books/42/read")).toBe(false);
    expect(adsAllowedOn("/books/9f9e0588-73aa/read")).toBe(false);
  });

  it("keeps login and the protected area free of ads", () => {
    for (const path of ["/login", "/app", "/app/dashboard", "/app/admin"]) {
      expect(adsAllowedOn(path)).toBe(false);
    }
  });
});

describe("loadAds", () => {
  const live = { host: ADSENSE_HOST, pathname: "/", native: false };

  it("loads nothing locally, in tests or on other hosts", () => {
    for (const host of ["localhost", "127.0.0.1", "omarfourati.de"]) {
      expect(loadAds({ ...live, host })).toBe(false);
    }
    expect(adScripts()).toHaveLength(0);
  });

  it("loads nothing in the Android/iOS app", () => {
    expect(loadAds({ ...live, native: true })).toBe(false);
    expect(adScripts()).toHaveLength(0);
  });

  it("loads nothing on login or in the protected area", () => {
    expect(loadAds({ ...live, pathname: "/login" })).toBe(false);
    expect(loadAds({ ...live, pathname: "/app/admin" })).toBe(false);
    expect(adScripts()).toHaveLength(0);
  });

  it("adds the AdSense loader once on the live site", () => {
    expect(loadAds(live)).toBe(true);
    expect(loadAds({ ...live, pathname: "/library" })).toBe(false);
    const [script] = adScripts();
    expect(adScripts()).toHaveLength(1);
    expect(script.src).toBe(
      `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`,
    );
    expect(script.async).toBe(true);
    expect(script.crossOrigin).toBe("anonymous");
  });

  it("requests only non-personalized ads (audience: children)", () => {
    loadAds(live);
    expect((window as AdsWindow).adsbygoogle?.requestNonPersonalizedAds).toBe(
      1,
    );
  });
});

describe("resetAdConsent", () => {
  it("expires the consent cookies on the host and every parent domain, then reloads", () => {
    const written: string[] = [];
    const doc = {
      set cookie(v: string) {
        written.push(v);
      },
      get cookie() {
        return "";
      },
    };
    const reload = vi.fn();
    resetAdConsent(doc, { hostname: ADSENSE_HOST, reload });
    for (const name of CONSENT_COOKIES) {
      expect(written).toContain(`${name}=; Max-Age=0; path=/`);
      expect(written).toContain(
        `${name}=; Max-Age=0; path=/; domain=.kibuka.omarfourati.de`,
      );
      expect(written).toContain(
        `${name}=; Max-Age=0; path=/; domain=.omarfourati.de`,
      );
    }
    expect(written.some((c) => c.endsWith("domain=.de"))).toBe(false);
    expect(reload).toHaveBeenCalledOnce();
  });
});
