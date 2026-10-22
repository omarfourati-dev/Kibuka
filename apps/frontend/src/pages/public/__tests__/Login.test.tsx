/**
 * TDD RED: Die Login-Seite trug noch das Template-Branding „OmarsApp"
 * und zeigte einen „Continue with Google"-Link auf /api/v1/auth/google,
 * der live 501 liefert (toter Link für Nutzer).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Switch } from "react-router-dom";
import { useAuthStore } from "@omarsapp/shared-stores";
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
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
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
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
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
