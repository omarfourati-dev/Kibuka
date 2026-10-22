/**
 * TDD RED: Kündigungsseite nach § 312k BGB — ohne Login, mit Bestätigungs-
 * seite, die man speichern/drucken kann.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CancellationPage from "../CancellationPage";

const RECEIPT = {
  reference: "11111111-2222-3333-4444-555555555555",
  received_at: "2026-10-22T18:30:05+00:00",
  name: "Omar Fourati",
  email: "omar@example.com",
  kind: "ordinary",
  reason: null,
  contract_reference: null,
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/kuendigen"]}>
      <CancellationPage />
    </MemoryRouter>,
  );
}

function fillIdentity() {
  fireEvent.change(screen.getByLabelText(/name/i), {
    target: { value: "Omar Fourati" },
  });
  fireEvent.change(screen.getByLabelText(/e-mail/i), {
    target: { value: "omar@example.com" },
  });
}

const submit = () =>
  fireEvent.click(screen.getByRole("button", { name: "Jetzt kündigen" }));

describe("CancellationPage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => vi.unstubAllGlobals());

  it("offers the cancellation form without login, ordinary preselected", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { level: 1, name: "Verträge hier kündigen" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /^ordentliche/i })).toBeChecked();
    expect(
      screen.getByRole("button", { name: "Jetzt kündigen" }),
    ).toBeInTheDocument();
  });

  it("sends the cancellation and shows a printable receipt", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 201,
      json: () => Promise.resolve(RECEIPT),
    } as Response);
    const print = vi.fn();
    vi.stubGlobal("print", print);

    renderPage();
    fillIdentity();
    submit();

    expect(
      await screen.findByRole("heading", { name: /eingegangen/i }),
    ).toBeInTheDocument();
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/v1/contracts/cancellation");
    expect((init as RequestInit).method).toBe("POST");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      name: "Omar Fourati",
      email: "omar@example.com",
      kind: "ordinary",
      reason: null,
      contract_reference: null,
    });
    expect(screen.getByText(RECEIPT.reference)).toBeInTheDocument();
    expect(screen.getByText(/22\.10\.2026/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /drucken/i }));
    expect(print).toHaveBeenCalled();
  });

  it("asks for a reason before sending an extraordinary cancellation", async () => {
    renderPage();
    fillIdentity();
    fireEvent.click(screen.getByRole("radio", { name: /außerordentlich/i }));
    submit();

    expect(await screen.findByRole("alert")).toHaveTextContent(/grund/i);
    expect(fetch).not.toHaveBeenCalled();

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 201,
      json: () =>
        Promise.resolve({ ...RECEIPT, kind: "extraordinary", reason: "Umzug" }),
    } as Response);
    fireEvent.change(screen.getByLabelText(/grund/i), {
      target: { value: "Umzug" },
    });
    submit();

    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    const body = JSON.parse(
      (vi.mocked(fetch).mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body).toMatchObject({ kind: "extraordinary", reason: "Umzug" });
  });

  it("does not send without name and e-mail", async () => {
    renderPage();
    submit();
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("keeps the input and explains a failure", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("offline"));
    renderPage();
    fillIdentity();
    submit();

    expect(await screen.findByRole("alert")).toHaveTextContent(/erneut/i);
    expect(screen.getByLabelText(/e-mail/i)).toHaveValue("omar@example.com");
  });

  it("explains the rate limit", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: false, status: 429 } as Response);
    renderPage();
    fillIdentity();
    submit();

    expect(await screen.findByRole("alert")).toHaveTextContent(/später/i);
  });
});
