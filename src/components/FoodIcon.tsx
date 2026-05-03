import type { SVGProps } from "react";
import { isIconKey, type IconKey } from "./foodIconRegistry";

type Props = Omit<SVGProps<SVGSVGElement>, "children"> & {
  iconKey: string | null | undefined;
  title?: string;
};

export function FoodIcon({ iconKey, title, ...svgProps }: Props) {
  const resolved: IconKey | null = isIconKey(iconKey) ? iconKey : null;
  const label = title ?? resolved ?? "food";
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      data-icon-key={resolved ?? "unknown"}
      {...svgProps}
    >
      <title>{label}</title>
      {resolved ? renderGlyph(resolved) : <FallbackGlyph />}
    </svg>
  );
}

function FallbackGlyph() {
  return (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 10h.01M15 10h.01M9 15c.83.67 1.83 1 3 1s2.17-.33 3-1" />
    </>
  );
}

/**
 * Phase 1 ships a minimal placeholder glyph per category. Phase 2+ replaces
 * each with hand-drawn artwork. The keys (not the artwork) are the contract
 * the backend depends on — adding a new key requires a backend seed update.
 */
function renderGlyph(key: IconKey) {
  const category = key.split("_")[0];
  switch (category) {
    case "cereal":
      return (
        <>
          <rect x="4" y="8" width="16" height="10" rx="2" />
          <path d="M8 8V6h8v2" />
        </>
      );
    case "bread":
      return (
        <>
          <path d="M4 12c0-3 3-5 8-5s8 2 8 5v6H4z" />
          <path d="M8 12v6M16 12v6" />
        </>
      );
    case "dairy":
      return (
        <>
          <path d="M9 3h6v3l1 4v9a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V10z" />
        </>
      );
    case "fruit":
      return (
        <>
          <circle cx="12" cy="13" r="7" />
          <path d="M12 6V3M11 3h2" />
        </>
      );
    case "veg":
      return (
        <>
          <path d="M12 21c5 0 8-4 8-9s-3-7-8-7-8 2-8 7 3 9 8 9z" />
          <path d="M12 5V2" />
        </>
      );
    default:
      return <FallbackGlyph />;
  }
}
