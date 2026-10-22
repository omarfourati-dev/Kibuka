/**
 * TDD RED: Vor dem Kauf digitaler Inhalte muss der Kunde ausdrücklich
 * zustimmen, dass die Bereitstellung sofort beginnt, und bestätigen, dass
 * er damit sein Widerrufsrecht verliert (§ 356 Abs. 5 BGB).
 */
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { WithdrawalWaiver } from "../WithdrawalWaiver";

describe("WithdrawalWaiver", () => {
  it("is an unticked checkbox that names the loss of the right of withdrawal", () => {
    render(<WithdrawalWaiver checked={false} onChange={() => {}} />);
    const box = screen.getByRole("checkbox", { name: /widerrufsrecht/i });
    expect(box).not.toBeChecked();
  });

  it("reports changes", () => {
    const onChange = vi.fn();
    render(<WithdrawalWaiver checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("explains itself when the buyer tried to skip it", () => {
    const { rerender } = render(
      <WithdrawalWaiver checked={false} onChange={() => {}} showError />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(/bestätige/i);

    rerender(<WithdrawalWaiver checked onChange={() => {}} showError />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
