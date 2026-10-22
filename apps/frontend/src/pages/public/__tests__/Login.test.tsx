/**
 * TDD RED: Die Login-Seite trug noch das Template-Branding „OmarsApp"
 * und zeigte einen „Continue with Google"-Link auf /api/v1/auth/google,
 * der live 501 liefert (toter Link für Nutzer).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { useAuthStore } from "@omarsapp/shared-stores";
import Login from "../Login";

function renderLogin() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/login"]}>
        <Login />
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
