/**
 * TDD RED: Ein Hook für den Abo-Status, den Startseite (Abo-Band) und
 * Werbung gemeinsam nutzen.
 * - Gäste: sofort false, ohne Anfrage
 * - Angemeldet: null, bis /billing/subscription/me antwortet
 * - Fehler zählen als "kein Abo" (Band zeigen ist harmlos)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAuthStore } from "@omarsapp/shared-stores";
import { useIsSubscriber } from "../useIsSubscriber";

function subscription(isActive: boolean) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve({ is_active: isActive }),
  } as Response;
}

describe("useIsSubscriber", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      accessToken: null,
    });
    vi.unstubAllGlobals();
  });

  it("is false for guests without asking the server", () => {
    useAuthStore.setState({ accessToken: null, isAuthenticated: false });
    const { result } = renderHook(() => useIsSubscriber());
    expect(result.current).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("is unknown (null) while the status loads, then true for subscribers", async () => {
    useAuthStore.setState({ accessToken: "tok", isAuthenticated: true });
    vi.mocked(fetch).mockResolvedValue(subscription(true));
    const { result } = renderHook(() => useIsSubscriber());
    expect(result.current).toBeNull();
    await waitFor(() => expect(result.current).toBe(true));
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/billing/subscription/me",
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer tok" }),
      }),
    );
  });

  it("is false for signed-in families without an active plan", async () => {
    useAuthStore.setState({ accessToken: "tok", isAuthenticated: true });
    vi.mocked(fetch).mockResolvedValue(subscription(false));
    const { result } = renderHook(() => useIsSubscriber());
    await waitFor(() => expect(result.current).toBe(false));
  });

  it("treats a failing request as no subscription", async () => {
    useAuthStore.setState({ accessToken: "tok", isAuthenticated: true });
    vi.mocked(fetch).mockRejectedValue(new Error("down"));
    const { result } = renderHook(() => useIsSubscriber());
    await waitFor(() => expect(result.current).toBe(false));
  });

  it("treats an error response as no subscription", async () => {
    useAuthStore.setState({ accessToken: "tok", isAuthenticated: true });
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    } as Response);
    const { result } = renderHook(() => useIsSubscriber());
    await waitFor(() => expect(result.current).toBe(false));
  });
});
