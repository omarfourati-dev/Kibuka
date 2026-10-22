/**
 * TDD RED: Die Settings-Seite sprach camelCase (avatarUrl/spaceId),
 * die Backend-API ist snake_case (avatar_url/space_id) — Profil-Updates
 * kamen nie an bzw. spaceId war immer undefined.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { useAuthStore } from "@omarsapp/shared-stores";
import { apiClient } from "@omarsapp/shared-api";
import Settings from "../Settings";

vi.mock("@omarsapp/shared-api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@omarsapp/shared-api")>();
  return {
    ...actual,
    apiClient: {
      ...actual.apiClient,
      patch: vi.fn(),
      delete: vi.fn(),
    },
  };
});

function renderSettings() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/app/settings"]}>
        <Settings />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Settings profile update contract", () => {
  beforeEach(() => {
    vi.mocked(apiClient.patch).mockReset();
    useAuthStore.setState({
      user: {
        id: "user-1",
        email: "omar@example.com",
        name: "Omar",
        role: "member",
      },
      isAuthenticated: true,
    });
  });

  it("sends avatar_url (snake_case) in the PATCH body", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      id: "user-1",
      email: "omar@example.com",
      name: "Omar",
      role: "member",
      status: "active",
      space_id: "space-9",
      avatar_url: "https://cdn.example.com/a.png",
    });

    renderSettings();
    fireEvent.change(screen.getByLabelText(/avatar/i), {
      target: { value: "https://cdn.example.com/a.png" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save|speichern/i }));

    await waitFor(() => {
      expect(apiClient.patch).toHaveBeenCalledWith(
        "/users/me",
        expect.objectContaining({
          avatar_url: "https://cdn.example.com/a.png",
        }),
      );
    });
    const body = vi.mocked(apiClient.patch).mock.calls[0][1] as Record<
      string,
      unknown
    >;
    expect(body.avatarUrl).toBeUndefined();
  });

  it("maps the snake_case response into the auth store", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({
      id: "user-1",
      email: "omar@example.com",
      name: "Omar Neu",
      role: "member",
      status: "active",
      space_id: "space-9",
      avatar_url: null,
    });

    renderSettings();
    fireEvent.change(screen.getByLabelText(/^name|full name/i), {
      target: { value: "Omar Neu" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save|speichern/i }));

    await waitFor(() => {
      expect(useAuthStore.getState().user?.name).toBe("Omar Neu");
    });
    expect(useAuthStore.getState().user?.spaceId).toBe("space-9");
  });
});
