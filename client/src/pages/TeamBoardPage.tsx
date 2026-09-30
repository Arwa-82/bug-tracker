import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getTeamBugs,
  createBug,
  updateBugStatus,
  deleteBug,
} from "../api/bugs";
import type { Bug, BugStatus, BugSeverity, BugPriority } from "../api/bugs";

const COLUMNS: { status: BugStatus; label: string }[] = [
  { status: "open", label: "Open" },
  { status: "in_progress", label: "In Progress" },
  { status: "fixed", label: "Fixed" },
  { status: "verified", label: "Verified" },
];

const nextStatusOptions: Record<BugStatus, BugStatus[]> = {
  open: ["in_progress"],
  in_progress: ["fixed", "open"],
  fixed: ["verified", "reopened"],
  verified: ["closed", "reopened"],
  closed: ["reopened"],
  reopened: ["in_progress"],
};

const severityBadge: Record<string, string> = {
  critical: "badge-error",
  high: "badge-warning",
  medium: "badge-warning badge-outline",
  low: "badge-ghost",
};

export default function TeamBoardPage() {
  const { teamId } = useParams<{ teamId: string }>();
  // useNavigate instead of <Link>, since the whole card is now clickable
  // and we need to trigger navigation from a regular onClick handler
  // on the outer div (a <Link> wrapping interactive children like
  // <select> and <button> causes nested-interactive-element issues).
  const navigate = useNavigate();

  const [bugs, setBugs] = useState<Bug[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState<BugSeverity>("medium");
  const [priority, setPriority] = useState<BugPriority>("medium");
  const [formError, setFormError] = useState<string | null>(null);

  const [bugToDelete, setBugToDelete] = useState<Bug | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function loadBugs() {
    if (!teamId) return;
    setLoading(true);
    setPageError(null);
    try {
      const res = await getTeamBugs(teamId);
      setBugs(res.bugs);
    } catch (err) {
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
      await createBug(teamId, { title, severity, priority });
      setTitle("");
      setSeverity("medium");
      setPriority("medium");
      setShowForm(false);
      await loadBugs();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create bug");
    }
  }

  async function handleStatusChange(bugId: string, newStatus: BugStatus) {
    try {
      await updateBugStatus(bugId, newStatus);
      await loadBugs();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Status change failed");
    }
  }

  async function confirmDelete() {
    if (!bugToDelete) return;
    setDeleting(true);
    try {
      await deleteBug(bugToDelete.id);
      setBugToDelete(null);
      await loadBugs();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete bug");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-10">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

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
          className="card mb-6 flex-col gap-3 bg-base-100 p-4 shadow"
        >
          <input
            type="text"
            placeholder="Bug title"
            className="input input-bordered w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-base-content/60">
                Severity
              </label>
              <select
                className="select select-bordered w-full"
                value={severity}
                onChange={(e) => setSeverity(e.target.value as BugSeverity)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div className="flex-1">
              <label className="mb-1 block text-xs text-base-content/60">
                Priority
              </label>
              <select
                className="select select-bordered w-full"
                value={priority}
                onChange={(e) => setPriority(e.target.value as BugPriority)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <button type="submit" className="btn btn-primary self-start">
            Create
          </button>

          {formError && <p className="text-sm text-error">{formError}</p>}
        </form>
      )}

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
                  // The whole card is now clickable — navigates to the
                  // bug's detail page. cursor-pointer + hover shadow signal
                  // that it's clickable. Interactive children (delete button,
                  // status select) each call stopPropagation so clicking them
                  // doesn't also trigger this outer navigation.
                  <div
                    key={bug.id}
                    onClick={() => navigate(`/bugs/${bug.id}`)}
                    className="card cursor-pointer bg-base-100 p-3 shadow border-l-4 border-primary transition hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{bug.title}</p>

                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // don't also navigate
                          setBugToDelete(bug);
                        }}
                        className="text-base-content/40 hover:text-error"
                        title="Delete bug"
                      >
                        ✕
                      </button>
                    </div>

                    <span
                      className={`badge badge-sm mt-1 w-fit ${severityBadge[bug.severity]}`}
                    >
                      {bug.severity}
                    </span>

                    <select
                      className="select select-bordered select-xs mt-2"
                      value=""
                      onClick={(e) => e.stopPropagation()} // don't navigate when opening the dropdown
                      onChange={(e) => {
                        e.stopPropagation();
                        handleStatusChange(bug.id, e.target.value as BugStatus);
                      }}
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

      {bugToDelete && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="text-lg font-semibold">Delete this bug?</h3>
            <p className="py-3 text-sm text-base-content/70">
              <span className="font-medium text-base-content">
                "{bugToDelete.title}"
              </span>{" "}
              will be permanently removed, along with its comments and
              attachments. This action cannot be undone.
            </p>
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => setBugToDelete(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="btn btn-error"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete bug"}
              </button>
            </div>
          </div>
          <div
            className="modal-backdrop"
            onClick={() => !deleting && setBugToDelete(null)}
          />
        </div>
      )}
    </div>
  );
}