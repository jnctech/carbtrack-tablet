import { useEffect, useId, useRef, useState } from "react";

export interface WeightModalProps {
  foodName: string;
  servingSizeG?: number | null;
  initialGrams: number;
  onClose: () => void;
  onConfirm: (grams: number) => void;
}

const MAX_GRAMS = 5000;
const PRESETS = [50, 100] as const;

/**
 * Always-open modal — parent controls mount/unmount, the dialog opens once
 * on mount and `onClose` fires for cancel/escape. Keeps the show/close
 * imperative side-effect to a single call and lets state be initialised
 * directly from props without a sync effect.
 */
export function WeightModal({
  foodName,
  servingSizeG,
  initialGrams,
  onClose,
  onConfirm,
}: Readonly<WeightModalProps>) {
  const [value, setValue] = useState<string>(String(initialGrams));
  const inputId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const numeric = Number(value);
  const valid =
    Number.isFinite(numeric) && numeric > 0 && numeric <= MAX_GRAMS;

  const handleConfirm = () => {
    if (!valid) return;
    onConfirm(Math.round(numeric * 10) / 10);
  };

  const servingPreset =
    typeof servingSizeG === "number" && servingSizeG > 0
      ? [{ value: servingSizeG, isServing: true }]
      : [];
  const presets: { value: number; isServing: boolean }[] = [
    ...PRESETS.map((g) => ({ value: g, isServing: false })),
    ...servingPreset,
  ];

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-label={`Set weight for ${foodName}`}
      className="rounded-2xl bg-card p-6 text-foreground shadow-xl backdrop:bg-black/40 max-w-sm w-full"
    >
      <h2 className="text-lg font-semibold">{foodName}</h2>
      <label
        htmlFor={inputId}
        className="mt-4 block text-sm text-muted-foreground"
      >
        Weight (grams)
      </label>
      <input
        id={inputId}
        type="number"
        inputMode="decimal"
        min={1}
        max={MAX_GRAMS}
        step={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-3 text-2xl font-medium outline-none focus:ring-2 focus:ring-ring"
      />
      {!valid && value !== "" && (
        <p className="mt-1 text-xs text-destructive">
          Enter a number between 1 and {MAX_GRAMS}.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={`${p.value}-${p.isServing ? "s" : "p"}`}
            type="button"
            onClick={() => setValue(String(p.value))}
            className="rounded-full border border-border bg-background px-3 py-1.5 text-sm hover:bg-muted/40"
          >
            {p.isServing ? `1 serving (${p.value} g)` : `${p.value} g`}
          </button>
        ))}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-border bg-background px-4 py-2 text-sm hover:bg-muted/40"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!valid}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          Confirm
        </button>
      </div>
    </dialog>
  );
}
