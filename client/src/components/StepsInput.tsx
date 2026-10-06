import { useState } from "react";

interface StepsInputProps {
  steps: string[];
  onChange: (steps: string[]) => void;
}

// A numbered list input — each row shows its number as a fixed label
// (not editable text), so there's no way for the user to type their own
// "1." and end up with double numbering. Matches how Jira's step/
// checklist inputs work.
export default function StepsInput({ steps, onChange }: StepsInputProps) {
  // Always keep one trailing empty row so there's somewhere to type
  // the "next" step — mirrors how Jira's checklist inputs behave.
  const rows = steps.length === 0 ? [""] : steps;

  function updateStep(index: number, value: string) {
    const next = [...rows];
    next[index] = value;

    // If they typed into the last (empty) row, add a new empty row
    // after it so they can keep going without clicking "Add step"
    if (index === rows.length - 1 && value.trim() !== "") {
      next.push("");
    }

    onChange(next.filter((s, i) => s.trim() !== "" || i === next.length - 1));
  }

  function removeStep(index: number) {
    const next = rows.filter((_, i) => i !== index);
    onChange(next.length > 0 ? next : [""]);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>, index: number) {
    // Enter moves focus to the next row (or creates one), similar to
    // pressing Enter in a real list editor
    if (e.key === "Enter") {
      e.preventDefault();
      const nextInput = document.getElementById(`step-input-${index + 1}`);
      nextInput?.focus();
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      {rows.map((step, i) => (
        <div key={i} className="flex items-center gap-2">
          {/* Fixed number label — not an input, so it can never be edited
              or duplicated by the user typing their own number */}
          <span className="w-5 shrink-0 text-right text-sm text-base-content/50">
            {i + 1}.
          </span>
          <input
            id={`step-input-${i}`}
            type="text"
            className="input input-bordered input-sm flex-1"
            placeholder={i === rows.length - 1 ? "Add a step..." : ""}
            value={step}
            onChange={(e) => updateStep(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, i)}
          />
          {/* Only show remove button on rows with content, and never
              on the last trailing empty row */}
          {step.trim() !== "" && (
            <button
              type="button"
              onClick={() => removeStep(i)}
              className="text-base-content/30 hover:text-error"
              title="Remove step"
            >
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  );
}