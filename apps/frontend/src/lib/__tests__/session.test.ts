/**
 * TDD RED: Der Access-Token lebt nur im Speicher — ohne Refresh war man
 * nach jedem Reload/Browser-Neustart ausgeloggt. restoreSession() holt
 * per httpOnly-Cookie einen frischen Token, logout() räumt Cookie + Store.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@omarsapp/shared-stores";
import type { AuthUser } from "@omarsapp/shared-types";
import { logout, restoreSession } from "../session";

const USER: AuthUser = {
  id: "u1",
  email: "o@example.com",
  name: "Omar",
  role: "member",
};

describe("restoreSession", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      accessToken: null,
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("skips the refresh call for visitors who never signed in", async () => {
    // Anonyme Besucher: kein unnötiger Request, keine 401 in der Konsole
    await expect(restoreSession()).resolves.toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("stores user and fresh token when the refresh cookie is valid", async () => {
    useAuthStore.setState({
      user: USER,
      isAuthenticated: true,
      accessToken: null,
    });
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ access_token: "fresh", user: USER }),
    } as Response);

    await expect(restoreSession()).resolves.toBe(true);

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/v1/auth/refresh");
    expect((init as RequestInit).method).toBe("POST");
    expect((init as RequestInit).credentials).toBe("include");
    expect(useAuthStore.getState().accessToken).toBe("fresh");
    expect(useAuthStore.getState().user?.email).toBe("o@example.com");
  });

  it("clears a stale persisted login when there is no valid cookie", async () => {
    useAuthStore.setState({
      user: USER,
      isAuthenticated: true,
      accessToken: null,
    });
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 401 } as Response);

    await expect(restoreSession()).resolves.toBe(false);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it("survives network errors without throwing", async () => {
    useAuthStore.setState({
      user: USER,
      isAuthenticated: true,
      accessToken: null,
    });
    vi.mocked(fetch).mockRejectedValue(new Error("offline"));
    await expect(restoreSession()).resolves.toBe(false);
  });
});

describe("logout", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true } as Response));
    useAuthStore.setState({
      user: USER,
      isAuthenticated: true,
      accessToken: "t",
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("tells the server to drop the refresh cookie and clears the store", async () => {
    await logout();

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/v1/auth/logout");
    expect((init as RequestInit).credentials).toBe("include");
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it("clears the store even if the server call fails", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("offline"));
    await logout();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
