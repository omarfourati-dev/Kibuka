/**
 * TDD RED: Kann man überhaupt ein Abo abschließen? (ENABLE_BILLING)
 * - null, bis /billing/config antwortet
 * - einmal pro Seitenaufruf gefragt, danach aus dem Speicher
 * - Fehler → false: lieber kein Abo-Band als eins, das ins Leere führt
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

async function loadHook() {
  // Frisches Modul je Test — der Cache lebt auf Modulebene
  vi.resetModules();
  return (await import("../useBillingEnabled")).useBillingEnabled;
}

function config(enabled: boolean) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve({ enabled }),
  } as Response;
}

describe("useBillingEnabled", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is unknown while loading, then follows the server", async () => {
    const useBillingEnabled = await loadHook();
    vi.mocked(fetch).mockResolvedValue(config(true));
    const { result } = renderHook(() => useBillingEnabled());
    expect(result.current).toBeNull();
    await waitFor(() => expect(result.current).toBe(true));
    expect(fetch).toHaveBeenCalledWith("/api/v1/billing/config");
  });

  it("is false when billing is switched off", async () => {
    const useBillingEnabled = await loadHook();
    vi.mocked(fetch).mockResolvedValue(config(false));
    const { result } = renderHook(() => useBillingEnabled());
    await waitFor(() => expect(result.current).toBe(false));
  });

  it("treats errors as switched off", async () => {
    const useBillingEnabled = await loadHook();
    vi.mocked(fetch).mockRejectedValue(new Error("down"));
    const { result } = renderHook(() => useBillingEnabled());
    await waitFor(() => expect(result.current).toBe(false));
  });

  it("asks only once, later views know it immediately", async () => {
    const useBillingEnabled = await loadHook();
    vi.mocked(fetch).mockResolvedValue(config(true));
    const first = renderHook(() => useBillingEnabled());
    await waitFor(() => expect(first.result.current).toBe(true));
    const later = renderHook(() => useBillingEnabled());
    expect(later.result.current).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
