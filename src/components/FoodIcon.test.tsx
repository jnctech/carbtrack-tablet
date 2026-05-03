import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FoodIcon } from "./FoodIcon";
import { ICON_KEYS, isIconKey } from "./foodIconRegistry";

describe("FoodIcon", () => {
  it("renders a known icon_key with its registered glyph", () => {
    const { container } = render(<FoodIcon iconKey="fruit_banana" />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("data-icon-key")).toBe("fruit_banana");
    expect(screen.getByLabelText("fruit_banana")).toBeInTheDocument();
  });

  it("falls back to unknown for unregistered keys", () => {
    const { container } = render(<FoodIcon iconKey="not_a_real_key" />);
    expect(container.querySelector("svg")?.getAttribute("data-icon-key")).toBe(
      "unknown",
    );
  });

  it("treats null and undefined as unknown", () => {
    const { container: a } = render(<FoodIcon iconKey={null} />);
    const { container: b } = render(<FoodIcon iconKey={undefined} />);
    expect(a.querySelector("svg")?.getAttribute("data-icon-key")).toBe("unknown");
    expect(b.querySelector("svg")?.getAttribute("data-icon-key")).toBe("unknown");
  });

  it("uses the provided title when given", () => {
    render(<FoodIcon iconKey="fruit_banana" title="Banana, raw" />);
    expect(screen.getByLabelText("Banana, raw")).toBeInTheDocument();
  });

  it("renders a glyph for every category prefix in the registry", () => {
    const seenCategories = new Set<string>();
    for (const key of ICON_KEYS) {
      seenCategories.add(key.split("_")[0]!);
      const { container } = render(<FoodIcon iconKey={key} />);
      expect(container.querySelector("svg path, svg rect, svg circle")).not.toBeNull();
    }
    expect(seenCategories).toEqual(
      new Set(["cereal", "bread", "dairy", "fruit", "veg"]),
    );
  });
});

describe("isIconKey", () => {
  it("accepts every registered key", () => {
    for (const key of ICON_KEYS) expect(isIconKey(key)).toBe(true);
  });
  it("rejects unknown values", () => {
    expect(isIconKey("nope")).toBe(false);
    expect(isIconKey(null)).toBe(false);
    expect(isIconKey(undefined)).toBe(false);
    expect(isIconKey("")).toBe(false);
  });
});
