/**
 * TDD RED: Der zentrale apiClient muss den Access-Token als
 * Authorization-Header mitsenden — ohne ihn laufen ALLE geschützten
 * Endpoints (AI-Chat, Settings, Admin) in 401, weil das Backend
 * ausschließlich Bearer-Tokens prüft (der Cookie-Pfad ist tot).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  apiClient,
  setAuthTokenProvider,
  setUnauthorizedHandler,
} from "../api-client";

function mockFetch(status = 200, body: unknown = {}) {
  const fn = vi.fn().mockResolvedValue({
    ok: status < 400,
    status,
    statusText: "Error",
    json: () => Promise.resolve(body),
  } as Response);
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("apiClient auth header", () => {
  beforeEach(() => {
    setAuthTokenProvider(null);
  });

  afterEach(() => {
    setAuthTokenProvider(null);
    vi.unstubAllGlobals();
  });

  it("sends Authorization: Bearer when a token provider is registered", async () => {
    const fetchMock = mockFetch();
    setAuthTokenProvider(() => "token-123");

    await apiClient.get("/users/me");

    const [, init] = fetchMock.mock.calls[0];
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: "Bearer token-123",
    });
  });

  it("sends no Authorization header without a token", async () => {
    const fetchMock = mockFetch();
    setAuthTokenProvider(() => null);

    await apiClient.get("/books");

    const [, init] = fetchMock.mock.calls[0];
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it("caller-supplied headers win over the provider token", async () => {
    const fetchMock = mockFetch();
    setAuthTokenProvider(() => "store-token");

    await apiClient.get("/books", {
      headers: { Authorization: "Bearer explicit" },
    });

    const [, init] = fetchMock.mock.calls[0];
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: "Bearer explicit",
    });
  });
});

describe("apiClient error parsing", () => {
  afterEach(() => {
    setAuthTokenProvider(null);
    vi.unstubAllGlobals();
  });

  it("parses the {error, code} contract", async () => {
    mockFetch(404, { error: "Book not found", code: "BOOK_NOT_FOUND" });

    await expect(apiClient.get("/books/x")).rejects.toMatchObject({
      status: 404,
      code: "BOOK_NOT_FOUND",
      message: "Book not found",
    });
  });

  it("falls back to FastAPI's {detail} shape", async () => {
    mockFetch(403, { detail: "Purchase required" });

    await expect(apiClient.get("/books/x/read")).rejects.toMatchObject({
      status: 403,
      message: "Purchase required",
    });
  });
});

describe("apiClient session expiry", () => {
  afterEach(() => {
    setUnauthorizedHandler(null);
    vi.unstubAllGlobals();
  });

  it("notifies the unauthorized handler on 401 so the app can clear state", async () => {
    mockFetch(401, { detail: "Authentication required" });
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);

    await expect(apiClient.get("/users/me")).rejects.toMatchObject({
      status: 401,
    });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("does not call the handler on other errors", async () => {
    mockFetch(404, { detail: "Not found" });
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);

    await expect(apiClient.get("/books/x")).rejects.toMatchObject({
      status: 404,
    });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});
