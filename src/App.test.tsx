import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";
import { ICON_KEYS } from "./components/foodIconRegistry";

describe("App", () => {
  it("renders the heading and one tile per registered icon_key", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: /carbtrack tablet/i }),
    ).toBeInTheDocument();
    for (const key of ICON_KEYS) {
      expect(screen.getAllByText(key).length).toBeGreaterThan(0);
    }
  });
});
