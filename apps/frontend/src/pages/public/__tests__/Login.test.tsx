/**
 * TDD RED: Die Login-Seite trug noch das Template-Branding „OmarsApp"
 * und zeigte einen „Continue with Google"-Link auf /api/v1/auth/google,
 * der live 501 liefert (toter Link für Nutzer).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { fireEvent } from "@testing-library/react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Switch } from "react-router-dom";
import { useAuthStore } from "@omarsapp/shared-stores";
import i18n from "../../../i18n/config";
import ar from "../../../i18n/locales/ar.json";
import Login from "../Login";

function renderLogin(entry = "/login") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[entry]}>
        <Switch>
          <Route path="/login" component={Login} />
          <Route
            path="/books/:bookId"
            render={() => <div>BookDetailTarget</div>}
          />
          <Route exact path="/" render={() => <div>HomeTarget</div>} />
        </Switch>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Login branding", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      accessToken: null,
    });
  });

  it("brands the page as Kibuka, not the template name", () => {
    renderLogin();
    expect(screen.getByText("Kibuka")).toBeInTheDocument();
    expect(screen.queryByText(/OmarsApp/)).not.toBeInTheDocument();
    expect(document.title).toContain("Kibuka");
  });

  it("does not offer the dead Google OAuth link (backend returns 501)", () => {
    renderLogin();
    expect(screen.queryByText(/Continue with Google/i)).not.toBeInTheDocument();
  });

  it("still offers email sign in", () => {
    renderLogin();
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password|passwort/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign in|anmelden/i }),
    ).toBeInTheDocument();
  });
});

describe("Login redirect", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      accessToken: null,
    });
  });

  it("returns the user to ?redirect= after sign in", () => {
    useAuthStore.setState({
      user: { id: "u1", email: "o@example.com", name: "O", role: "member" },
      isAuthenticated: true,
      accessToken: "t",
    });
    renderLogin("/login?redirect=/books/b1");
    expect(screen.getByText("BookDetailTarget")).toBeInTheDocument();
  });

  it("stays on the form when the persisted flag is stale (no token) — bounce trap", () => {
    // Nach Reload: user+isAuthenticated aus localStorage, Token weg.
    // Die Login-Seite darf dann NICHT wegredirecten, sonst kommt man nie
    // wieder an das Formular heran.
    useAuthStore.setState({
      user: { id: "u1", email: "o@example.com", name: "O", role: "member" },
      isAuthenticated: true,
      accessToken: null,
    });
    renderLogin("/login?redirect=/books/b1");
    expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    expect(screen.queryByText("BookDetailTarget")).not.toBeInTheDocument();
  });

  it("ignores external redirect targets (no open redirect)", () => {
    useAuthStore.setState({
      user: { id: "u1", email: "o@example.com", name: "O", role: "member" },
      isAuthenticated: true,
      accessToken: "t",
    });
    renderLogin("/login?redirect=https://evil.example/phish");
    expect(screen.getByText("HomeTarget")).toBeInTheDocument();
  });
});

describe("Login — Sprache", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      accessToken: null,
    });
  });

  it("speaks German to German users", () => {
    renderLogin();
    expect(screen.getByLabelText("E-Mail")).toBeInTheDocument();
    expect(screen.getByLabelText("Passwort")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Anmelden" }),
    ).toBeInTheDocument();
    expect(document.title).toBe("Anmelden | Kibuka");
  });

  it("switches to registration with its own title", () => {
    renderLogin();
    fireEvent.click(screen.getByRole("tab", { name: "Neu hier" }));
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Konto erstellen" }),
    ).toBeInTheDocument();
    expect(document.title).toBe("Registrieren | Kibuka");
  });

  it("speaks Arabic and keeps e-mail and password left-to-right", async () => {
    await i18n.changeLanguage("ar");
    renderLogin();
    const email = screen.getByLabelText(ar.login.email);
    expect(email).toHaveAttribute("dir", "ltr");
    expect(screen.getByLabelText(ar.login.password)).toHaveAttribute(
      "dir",
      "ltr",
    );
    expect(
      screen.getByRole("button", { name: ar.login.signIn }),
    ).toBeInTheDocument();
    expect(screen.getByText(ar.login.welcomeBack)).toBeInTheDocument();
    expect(document.title).toBe(ar.meta.login);
  });

  it("leads the logo back to the home page of the app language", async () => {
    await i18n.changeLanguage("ar");
    renderLogin();
    expect(screen.getByRole("link", { name: "Kibuka" })).toHaveAttribute(
      "href",
      "/ar",
    );
  });
});

describe("Login – Familienkonto vor dem Lesen", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      accessToken: null,
    });
  });

  it("explains the free family account when a reader sent the visitor here", () => {
    renderLogin("/login?redirect=/books/b1/read");
    expect(
      screen.getByRole("heading", { level: 1, name: "Euer Familienkonto" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Buch des Tages gratis/)).toBeInTheDocument();
    // Neue Besucher zuerst: Registrierung ist vorausgewählt
    expect(screen.getByRole("tab", { name: "Neu hier" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.getByRole("button", { name: "Konto anlegen und lesen" }),
    ).toBeInTheDocument();
  });

  it("switches between new account and sign in with tabs", () => {
    renderLogin("/login?redirect=/books/b1/read");
    fireEvent.click(screen.getByRole("tab", { name: "Anmelden" }));
    expect(screen.getByRole("tab", { name: "Anmelden" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.getByRole("button", { name: "Anmelden und lesen" }),
    ).toBeInTheDocument();
  });

  it("starts with sign in for everybody else", () => {
    renderLogin("/login?redirect=/profile");
    expect(screen.getByRole("tab", { name: "Anmelden" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});
