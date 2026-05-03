import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { WeightModal } from "./WeightModal";

describe("WeightModal", () => {
  it("opens with the initial weight pre-filled", () => {
    render(
      <WeightModal
        foodName="Banana"
        initialGrams={120}
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    );
    const input = screen.getByLabelText(/weight \(grams\)/i) as HTMLInputElement;
    expect(input.value).toBe("120");
  });

  it("renders the serving preset only when servingSizeG is provided", () => {
    const { rerender } = render(
      <WeightModal
        foodName="Apple"
        initialGrams={100}
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    );
    expect(screen.queryByText(/1 serving/i)).not.toBeInTheDocument();
    rerender(
      <WeightModal
        foodName="Apple"
        initialGrams={100}
        servingSizeG={182}
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    );
    expect(screen.getByText(/1 serving \(182 g\)/i)).toBeInTheDocument();
  });

  it("preset buttons replace the input value", async () => {
    const user = userEvent.setup();
    render(
      <WeightModal
        foodName="Banana"
        initialGrams={100}
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    );
    await user.click(screen.getByRole("button", { name: "50 g" }));
    expect(
      (screen.getByLabelText(/weight \(grams\)/i) as HTMLInputElement).value,
    ).toBe("50");
  });

  it("Confirm fires onConfirm with the rounded weight", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <WeightModal
        foodName="Banana"
        initialGrams={100}
        onClose={() => {}}
        onConfirm={onConfirm}
      />,
    );
    const input = screen.getByLabelText(/weight \(grams\)/i);
    await user.clear(input);
    await user.type(input, "150");
    await user.click(screen.getByRole("button", { name: /confirm/i }));
    expect(onConfirm).toHaveBeenCalledWith(150);
  });

  it("Confirm is disabled and skipped for invalid input", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <WeightModal
        foodName="Banana"
        initialGrams={100}
        onClose={() => {}}
        onConfirm={onConfirm}
      />,
    );
    const input = screen.getByLabelText(/weight \(grams\)/i);
    await user.clear(input);
    await user.type(input, "0");
    const confirm = screen.getByRole("button", {
      name: /confirm/i,
    }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    expect(screen.getByText(/enter a number between 1 and 5000/i)).toBeInTheDocument();
    await user.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("Cancel triggers onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <WeightModal
        foodName="Banana"
        initialGrams={100}
        onClose={onClose}
        onConfirm={() => {}}
      />,
    );
    await user.click(screen.getByRole("button", { name: /cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
