import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getTeamBugs, createBug, updateBugStatus } from "../api/bugs";
import type { Bug, BugStatus } from "../api/bugs";

// The columns shown on the board, in display order.
// Keeping "closed" out for now to match the earlier mockup —
// closed bugs matter less day-to-day.
const COLUMNS: { status: BugStatus; label: string }[] = [
  { status: "open", label: "Open" },
  { status: "in_progress", label: "In Progress" },
  { status: "fixed", label: "Fixed" },
  { status: "verified", label: "Verified" },
];

// Maps each status to a valid "next" status, for the simple
// dropdown-based status changer (mirrors the backend's statusWorkflow.ts)
const nextStatusOptions: Record<BugStatus, BugStatus[]> = {
  open: ["in_progress"],
  in_progress: ["fixed", "open"],
  fixed: ["verified", "reopened"],
  verified: ["closed", "reopened"],
  closed: ["reopened"],
  reopened: ["in_progress"],
};

// Tailwind/DaisyUI classes per severity, so the badge color matches meaning
const severityBadge: Record<string, string> = {
  critical: "badge-error",
  high: "badge-warning",
  medium: "badge-warning badge-outline",
  low: "badge-ghost",
};

export default function TeamBoardPage() {
  // teamId comes from the URL, e.g. /teams/:teamId/board
  const { teamId } = useParams<{ teamId: string }>();

  const [bugs, setBugs] = useState<Bug[]>([]);
  const [loading, setLoading] = useState(true);

  // Page-level error (e.g. "not a member of this team") — separate
  // from the bug-creation form's own error message below
  const [pageError, setPageError] = useState<string | null>(null);

  // New-bug form state
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Re-fetches all bugs for this team — called on mount and after any change
  async function loadBugs() {
    if (!teamId) return;
    setLoading(true);
    setPageError(null);
    try {
      const res = await getTeamBugs(teamId);
      setBugs(res.bugs);
    } catch (err) {
      // e.g. 403 "You are not a member of this team" from the backend
      setPageError(err instanceof Error ? err.message : "Failed to load bugs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBugs();
  }, [teamId]);

  async function handleCreateBug(e: React.FormEvent) {
    e.preventDefault();
    if (!teamId) return;
    setFormError(null);

    try {
      await createBug(teamId, { title });
      setTitle("");
      setShowForm(false);
      await loadBugs(); // refresh so the new bug appears in the Open column
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create bug");
    }
  }

  async function handleStatusChange(bugId: string, newStatus: BugStatus) {
    try {
      await updateBugStatus(bugId, newStatus);
      await loadBugs(); // refresh so the card moves to its new column
    } catch (err) {
      // If the backend rejects the transition, show it as a simple alert for now.
      // We'll replace this with a proper toast component later.
      alert(err instanceof Error ? err.message : "Status change failed");
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-10">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  // Shown when the user can't access this team's bugs at all
  // (e.g. not a member) — stops the page from rendering blank
  if (pageError) {
    return <div className="p-6 text-error">{pageError}</div>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-medium">Board</h1>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setShowForm((prev) => !prev)}
        >
          {showForm ? "Cancel" : "New bug"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreateBug}
          className="card mb-6 flex-row gap-3 bg-base-100 p-4 shadow"
        >
          <input
            type="text"
            placeholder="Bug title"
            className="input input-bordered flex-1"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <button type="submit" className="btn btn-primary">
            Create
          </button>
          {formError && <p className="text-sm text-error">{formError}</p>}
        </form>
      )}

      {/* One column per status, each showing only the bugs currently in it */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {COLUMNS.map((col) => {
          const bugsInColumn = bugs.filter((b) => b.status === col.status);

          return (
            <div key={col.status}>
              <p className="mb-2 text-xs font-medium text-base-content/60">
                {col.label.toUpperCase()} &nbsp;{bugsInColumn.length}
              </p>

              <div className="flex flex-col gap-2">
                {bugsInColumn.map((bug) => (
                  <div
                    key={bug.id}
                    className="card bg-base-100 p-3 shadow border-l-4 border-primary"
                  >
                    {/* Title links to the bug's detail page. Kept separate from
                        the dropdown below so clicking "Move to..." doesn't
                        also trigger navigation */}
                    <Link
                      to={`/bugs/${bug.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {bug.title}
                    </Link>

                    <span
                      className={`badge badge-sm mt-1 w-fit ${severityBadge[bug.severity]}`}
                    >
                      {bug.severity}
                    </span>

                    {/* Fallback status control — no drag-and-drop yet */}
                    <select
                      className="select select-bordered select-xs mt-2"
                      value=""
                      onChange={(e) =>
                        handleStatusChange(bug.id, e.target.value as BugStatus)
                      }
                    >
                      <option value="" disabled>
                        Move to...
                      </option>
                      {nextStatusOptions[bug.status].map((s) => (
                        <option key={s} value={s}>
                          {s.replace("_", " ")}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}