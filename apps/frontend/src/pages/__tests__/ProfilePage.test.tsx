/**
 * TDD RED: Es gab keinerlei sichtbaren Auth-Status in der App — kein
 * Profil, kein Abmelden-Knopf. Der Profil-Tab zeigt, wer angemeldet ist,
 * und bietet An-/Abmelden.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Switch } from "react-router-dom";
import { useAuthStore } from "@omarsapp/shared-stores";
import ProfilePage from "../ProfilePage";

function renderProfile() {
  return render(
    <MemoryRouter initialEntries={["/profile"]}>
      <Switch>
        <Route exact path="/profile" component={ProfilePage} />
        <Route path="/login" render={() => <div>LoginPage</div>} />
      </Switch>
    </MemoryRouter>,
  );
}

describe("ProfilePage", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      accessToken: null,
    });
  });

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

  it("logout clears the auth store and shows the anonymous state", () => {
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
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(screen.getByText(/nicht angemeldet/i)).toBeInTheDocument();
  });
});
