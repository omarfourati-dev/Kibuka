/**
 * TDD RED: Es gab keinerlei sichtbaren Auth-Status in der App — kein
 * Profil, kein Abmelden-Knopf. Der Profil-Tab zeigt, wer angemeldet ist,
 * und bietet An-/Abmelden.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Switch } from "react-router-dom";
import { useAuthStore } from "@omarsapp/shared-stores";
import ProfilePage from "../ProfilePage";

function renderProfile(entry = "/profile") {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Switch>
        <Route exact path="/profile" component={ProfilePage} />
        <Route path="/login" render={() => <div>LoginPage</div>} />
        <Route path="/pricing" render={() => <div>PricingPage</div>} />
      </Switch>
    </MemoryRouter>,
  );
}

const SIGNED_IN = {
  user: {
    id: "u1",
    email: "omar@example.com",
    name: "Omar",
    role: "member" as const,
  },
  isAuthenticated: true,
  accessToken: "t",
};

function subscriptionResponse(body: Record<string, unknown>) {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  } as Response;
}

const NO_SUB = {
  status: "none",
  plan: null,
  current_period_end: null,
  cancel_at_period_end: false,
  is_active: false,
};

describe("ProfilePage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(subscriptionResponse(NO_SUB)),
    );
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      accessToken: null,
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("tells anonymous users they are not signed in and offers login", () => {
    renderProfile();
    expect(screen.getByText(/nicht angemeldet/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /anmelden/i }));
    expect(screen.getByText("LoginPage")).toBeInTheDocument();
  });

  it("shows name, email and role when signed in", () => {
    useAuthStore.setState({
      user: {
        id: "u1",
        email: "omar@example.com",
        name: "Omar",
        role: "member",
      },
      isAuthenticated: true,
      accessToken: "t",
    });
    renderProfile();
    expect(screen.getByText("Omar")).toBeInTheDocument();
    expect(screen.getByText("omar@example.com")).toBeInTheDocument();
  });

  it("logout also tells the server to drop the refresh cookie", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true } as Response);
    vi.stubGlobal("fetch", fetchMock);
    useAuthStore.setState({
      user: {
        id: "u1",
        email: "omar@example.com",
        name: "Omar",
        role: "member",
      },
      isAuthenticated: true,
      accessToken: "t",
    });
    renderProfile();
    fireEvent.click(screen.getByRole("button", { name: /abmelden/i }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/v1/auth/logout",
        expect.objectContaining({ method: "POST" }),
      );
    });
    vi.unstubAllGlobals();
  });

  it("logout clears the auth store and shows the anonymous state", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true } as Response));
    useAuthStore.setState({
      user: {
        id: "u1",
        email: "omar@example.com",
        name: "Omar",
        role: "member",
      },
      isAuthenticated: true,
      accessToken: "t",
    });
    renderProfile();
    fireEvent.click(screen.getByRole("button", { name: /abmelden/i }));
    await waitFor(() => {
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(screen.getByText(/nicht angemeldet/i)).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("shows the active subscription and opens the Stripe portal", async () => {
    const assign = vi.fn();
    Object.defineProperty(window, "location", {
      value: { ...window.location, assign },
      writable: true,
    });
    vi.mocked(fetch).mockImplementation((url) =>
      Promise.resolve(
        String(url).includes("/billing/portal")
          ? subscriptionResponse({ url: "https://billing.stripe.com/p" })
          : subscriptionResponse({
              status: "active",
              plan: "monthly",
              current_period_end: "2026-11-22T00:00:00Z",
              cancel_at_period_end: false,
              is_active: true,
            }),
      ),
    );
    useAuthStore.setState(SIGNED_IN);

    renderProfile();
    await waitFor(() => {
      expect(screen.getByText(/Monatsabo/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /abo verwalten/i }));
    await waitFor(() => {
      expect(assign).toHaveBeenCalledWith("https://billing.stripe.com/p");
    });
  });

  it("offers the plans when there is no subscription", async () => {
    useAuthStore.setState(SIGNED_IN);
    renderProfile();
    await waitFor(() => {
      expect(screen.getByText(/kein abo/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /abo ansehen/i }));
    expect(screen.getByText("PricingPage")).toBeInTheDocument();
  });

  it("welcomes new subscribers after the Stripe checkout", async () => {
    useAuthStore.setState(SIGNED_IN);
    renderProfile("/profile?subscription=success");
    expect(screen.getByText(/willkommen im abo/i)).toBeInTheDocument();
  });

  it("does not query billing for anonymous users", () => {
    renderProfile();
    expect(fetch).not.toHaveBeenCalled();
  });
});
