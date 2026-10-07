import { useEffect, useState } from "react";
import { searchBugs, linkBug } from "../api/bugs";
import type { BugWithTeam } from "../api/bugs";

interface LinkBugPickerProps {
  currentBugId: string;
  onLinked: () => void; // called after a successful link, so the parent can refresh
  onClose: () => void;
}

// A small search-as-you-type picker for linking the current bug to
// another one, shown as a modal. Results include the team name so
// cross-team links are clear about where the other bug lives.
export default function LinkBugPicker({
  currentBugId,
  onLinked,
  onClose,
}: LinkBugPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BugWithTeam[]>([]);
  const [searching, setSearching] = useState(false);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Debounced search — waits 300ms after typing stops before searching,
  // so we don't fire a request on every keystroke
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchBugs(query);
        // Exclude the current bug itself from its own link results
        setResults(res.bugs.filter((b) => b.id !== currentBugId));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, currentBugId]);

  async function handleLink(bugId: string) {
    setLinkingId(bugId);
    setError(null);
    try {
      await linkBug(currentBugId, bugId);
      onLinked();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to link bug");
    } finally {
      setLinkingId(null);
    }
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="mb-3 text-lg font-semibold">Link to another bug</h3>

        <input
          type="text"
          autoFocus
          className="input input-bordered w-full"
          placeholder="Search bugs by title..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {error && <p className="mt-2 text-sm text-error">{error}</p>}

        <div className="mt-3 flex max-h-64 flex-col gap-1 overflow-y-auto">
          {searching && (
            <p className="py-2 text-center text-sm text-base-content/50">
              Searching...
            </p>
          )}

          {!searching && query.trim().length >= 2 && results.length === 0 && (
            <p className="py-2 text-center text-sm text-base-content/50">
              No matching bugs found.
            </p>
          )}

          {results.map((bug) => (
            <button
              key={bug.id}
              onClick={() => handleLink(bug.id)}
              disabled={linkingId === bug.id}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-base-200 disabled:opacity-50"
            >
              <div>
                <p className="text-sm font-medium">{bug.title}</p>
                <p className="text-xs text-base-content/50">
                  {bug.team.name} ({bug.team.key})
                </p>
              </div>
              <span className="text-xs text-primary">
                {linkingId === bug.id ? "Linking..." : "Link"}
              </span>
            </button>
          ))}
        </div>

        <div className="modal-action">
          <button onClick={onClose} className="btn btn-ghost btn-sm">
            Close
          </button>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}