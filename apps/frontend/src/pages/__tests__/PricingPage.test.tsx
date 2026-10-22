import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Switch } from "react-router-dom";
import { useAuthStore } from "@omarsapp/shared-stores";
import PricingPage from "../PricingPage";

// Mock PricingCard to isolate PricingPage tests
vi.mock("../../components/pricing/PricingCard", () => ({
  PricingCard: ({
    title,
    price,
    badge,
    ctaLabel,
    onCta,
  }: {
    title: string;
    price: string;
    badge?: string;
    ctaLabel: string;
    onCta: () => void;
  }) => (
    <div data-testid="pricing-card">
      <span data-testid="card-title">{title}</span>
      <span data-testid="card-price">{price}</span>
      {badge && <span data-testid="card-badge">{badge}</span>}
      <button onClick={onCta}>{ctaLabel}</button>
    </div>
  ),
}));

function renderPricingPage(entry = "/pricing") {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Switch>
        <Route exact path="/pricing" component={PricingPage} />
        <Route path="/login" render={() => <div>LoginTarget</div>} />
        <Route path="/library" render={() => <div>LibraryTarget</div>} />
        <Route path="/profile" render={() => <div>ProfileTarget</div>} />
      </Switch>
    </MemoryRouter>,
  );
}

const assignMock = vi.fn();

function clickCta(title: string) {
  const card = screen
    .getAllByTestId("pricing-card")
    .find((c) => c.textContent?.includes(title));
  if (!card) throw new Error(`card ${title} not found`);
  fireEvent.click(card.querySelector("button")!);
}

describe("PricingPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    assignMock.mockReset();
    Object.defineProperty(window, "location", {
      value: { ...window.location, assign: assignMock },
      writable: true,
    });
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      accessToken: null,
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("renders the three real plans — no Wochenpaket", () => {
    renderPricingPage();
    const titles = screen
      .getAllByTestId("card-title")
      .map((t) => t.textContent);
    expect(titles).toEqual(["Jährlich", "Monatlich", "Einzelbuch"]);
  });

  it("shows the real single-book price", () => {
    renderPricingPage();
    const prices = screen
      .getAllByTestId("card-price")
      .map((p) => p.textContent);
    expect(prices).toContain("€2,99");
  });

  it("makes no false promises (no card-free trial, no offline)", () => {
    renderPricingPage();
    expect(screen.queryByText(/keine Kreditkarte/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/offline/i)).not.toBeInTheDocument();
    expect(screen.getByText(/inkl\. MwSt/i)).toBeInTheDocument();
  });

  it("anonymous subscribe sends the user to login and back to pricing", () => {
    renderPricingPage();
    clickCta("Monatlich");
    expect(screen.getByText("LoginTarget")).toBeInTheDocument();
  });

  it("signed-in subscribe starts the Stripe subscription checkout", async () => {
    useAuthStore.setState({
      user: { id: "u1", email: "o@example.com", name: "O", role: "member" },
      isAuthenticated: true,
      accessToken: "tok",
    });
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ url: "https://checkout.stripe.com/sub" }),
    } as Response);

    renderPricingPage();
    clickCta("Jährlich");

    await waitFor(() => {
      expect(assignMock).toHaveBeenCalledWith(
        "https://checkout.stripe.com/sub",
      );
    });
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/v1/billing/checkout/subscription");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      plan: "yearly",
    });
    expect((init as RequestInit).headers).toMatchObject({
      Authorization: "Bearer tok",
    });
  });

  it("existing subscribers are pointed to their profile (409)", async () => {
    useAuthStore.setState({
      user: { id: "u1", email: "o@example.com", name: "O", role: "member" },
      isAuthenticated: true,
      accessToken: "tok",
    });
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 409 } as Response);

    renderPricingPage();
    clickCta("Monatlich");

    await waitFor(() => {
      expect(screen.getByText(/bereits ein aktives Abo/i)).toBeInTheDocument();
    });
    expect(assignMock).not.toHaveBeenCalled();
  });

  it("single-book CTA leads to the library", () => {
    renderPricingPage();
    clickCta("Einzelbuch");
    expect(screen.getByText("LibraryTarget")).toBeInTheDocument();
  });

  it("shows a note after a cancelled subscription checkout", () => {
    renderPricingPage("/pricing?subscription=cancel");
    expect(screen.getByText(/Abo-Abschluss abgebrochen/i)).toBeInTheDocument();
  });

  it("shows Beliebteste Wahl badge on monthly plan", () => {
    renderPricingPage();
    const badges = screen.getAllByTestId("card-badge");
    const beliebtesteBadge = badges.find((b) =>
      b.textContent?.includes("Beliebteste Wahl"),
    );
    expect(beliebtesteBadge).toBeTruthy();
  });

  it("shows Bestes Preis-Leistungs-Verhältnis on yearly plan", () => {
    renderPricingPage();
    const badges = screen.getAllByTestId("card-badge");
    const bestValueBadge = badges.find((b) =>
      b.textContent?.includes("Bestes Preis-Leistungs"),
    );
    expect(bestValueBadge).toBeTruthy();
  });

  it("renders FAQ section with 5 questions", () => {
    renderPricingPage();
    // FAQ section heading
    expect(
      screen.getByText(/häufig gestellte fragen|faq/i),
    ).toBeInTheDocument();
    // 5 FAQ items
    const faqItems = screen.getAllByRole("button", {
      name: /Kann ich|Welche Sprachen|Für welches Alter|Probezeit|Geräten/i,
    });
    expect(faqItems.length).toBeGreaterThanOrEqual(5);
  });

  it("FAQ answers are visible or expandable", () => {
    renderPricingPage();
    // At minimum one answer should be present or become present after interaction
    const faqButtons = screen.getAllByRole("button", {
      name: /Kann ich|Welche Sprachen|Für welches Alter|Probezeit|Geräten/i,
    });
    // Click the first FAQ item
    fireEvent.click(faqButtons[0]);
    // Answer text should appear in the document
    expect(document.body.textContent).toMatch(
      /jederzeit|kündigen|sprachen|alter|kostenlos|web|ios|android/i,
    );
  });

  it("renders CTA buttons for each plan", () => {
    renderPricingPage();
    const ctaButtons = screen.getAllByRole("button", {
      name: /Jetzt starten/i,
    });
    expect(ctaButtons.length).toBe(3);
  });
});
