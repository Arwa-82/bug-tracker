import { useState } from "react";

interface LabelsInputProps {
  labels: string[];
  onChange: (labels: string[]) => void;
}

// A simple tag input: type a label, press Enter or comma to add it as
// a chip, click the "x" on a chip to remove it. No autocomplete/suggestions
// for now — just free-text tags, matching how the Bug model stores them.
export default function LabelsInput({ labels, onChange }: LabelsInputProps) {
  const [draft, setDraft] = useState("");

  function addLabel() {
    const cleaned = draft.trim().toLowerCase();
    if (!cleaned) return;
    if (labels.includes(cleaned)) {
      setDraft("");
      return; // silently ignore duplicates
    }
    onChange([...labels, cleaned]);
    setDraft("");
  }

  function removeLabel(label: string) {
    onChange(labels.filter((l) => l !== label));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addLabel();
    }
    // Backspace on an empty input removes the last chip — common tag-input UX
    if (e.key === "Backspace" && draft === "" && labels.length > 0) {
      removeLabel(labels[labels.length - 1]);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-base-300 p-2">
      {labels.map((label) => (
        <span
          key={label}
          className="badge badge-sm gap-1 bg-base-200 text-base-content"
        >
          {label}
          <button
            type="button"
            onClick={() => removeLabel(label)}
            className="text-base-content/50 hover:text-error"
          >
            ✕
          </button>
        </span>
      ))}
      <input
        type="text"
        className="min-w-[100px] flex-1 bg-transparent text-sm outline-none"
        placeholder={labels.length === 0 ? "Add a label..." : ""}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addLabel}
      />
    </div>
  );
}