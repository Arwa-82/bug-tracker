import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  DndContext,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  getTeamBugs,
  createBug,
  updateBugStatus,
  deleteBug,
} from "../api/bugs";
import type { Bug, BugStatus, BugSeverity, BugPriority } from "../api/bugs";
import { getTeamMembers } from "../api/teams";
import type { Member } from "../api/teams";
import StepsInput from "../components/StepsInput";
import LabelsInput from "../components/LabelsInput";

const COLUMNS: { status: BugStatus; label: string }[] = [
  { status: "open", label: "Open" },
  { status: "in_progress", label: "In Progress" },
  { status: "fixed", label: "Fixed" },
  { status: "verified", label: "Verified" },
  { status: "closed", label: "Closed" },
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-1.5 border-l-[3px] border-[#7C3AED] pl-2.5 text-xs font-bold uppercase tracking-wide text-[#7C3AED]">
      {children}
    </h3>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function DraggableBugCard({
  bug,
  assigneeName,
  onOpen,
  onDelete,
  onStatusChange,
}: {
  bug: Bug;
  assigneeName: string | null;
  onOpen: () => void;
  onDelete: () => void;
  onStatusChange: (status: BugStatus) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: bug.id });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onOpen}
      className={`card cursor-grab bg-base-100 p-3 shadow border-l-4 border-primary transition hover:shadow-md active:cursor-grabbing ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium">{bug.title}</p>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="text-base-content/40 hover:text-error"
          title="Delete bug"
        >
          ✕
        </button>
      </div>

      <div className="mt-1 flex items-center justify-between">
        <span className={`badge badge-sm ${severityBadge[bug.severity]}`}>
          {bug.severity}
        </span>

        {assigneeName ? (
          <div
            className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-content"
            title={assigneeName}
          >
            {getInitials(assigneeName)}
          </div>
        ) : (
          <div
            className="flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-base-content/30 text-[10px] text-base-content/40"
            title="Unassigned"
          >
            ?
          </div>
        )}
      </div>

      {/* Label chips, shown only if the bug has any */}
      {bug.labels.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {bug.labels.map((label) => (
            <span
              key={label}
              className="badge badge-ghost badge-xs"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      <select
        className="select select-bordered select-xs mt-2"
        value=""
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        onChange={(e) => {
          e.stopPropagation();
          onStatusChange(e.target.value as BugStatus);
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
  );
}

function DroppableColumn({
  status,
  label,
  children,
}: {
  status: BugStatus;
  label: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg p-1 transition-colors ${
        isOver ? "bg-primary/10" : ""
      }`}
    >
      <p className="mb-2 px-2 text-xs font-medium text-base-content/60">
        {label.toUpperCase()}
      </p>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

export default function TeamBoardPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();

  const [bugs, setBugs] = useState<Bug[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // Toolbar: search + filters, applied in-memory over the already-loaded bugs
  const [searchText, setSearchText] = useState("");
  const [severityFilter, setSeverityFilter] = useState<BugSeverity | "">("");
  const [assigneeFilter, setAssigneeFilter] = useState<string>(""); // "", "me", or a userId
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState<BugSeverity>("medium");
  const [priority, setPriority] = useState<BugPriority>("medium");
  const [steps, setSteps] = useState<string[]>([""]);
  const [expectedResult, setExpectedResult] = useState("");
  const [actualResult, setActualResult] = useState("");
  const [device, setDevice] = useState("");
  const [browser, setBrowser] = useState("");
  const [labels, setLabels] = useState<string[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [bugToDelete, setBugToDelete] = useState<Bug | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [statusError, setStatusError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  async function loadBoard() {
    if (!teamId) return;
    setLoading(true);
    setPageError(null);
    try {
      const [bugsRes, membersRes] = await Promise.all([
        getTeamBugs(teamId),
        getTeamMembers(teamId),
      ]);
      setBugs(bugsRes.bugs);
      setMembers(membersRes.members);
    } catch (err) {
      setPageError(err instanceof Error ? err.message : "Failed to load bugs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBoard();
  }, [teamId]);

  // Figure out the current user's id (for the "My bugs" filter) by
  // matching their token-derived identity against the member list —
  // simplest approach without adding a separate "whoami" call here,
  // since useAuth's user object doesn't currently expose this page.
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setCurrentUserId(payload.userId || null);
    } catch {
      setCurrentUserId(null);
    }
  }, []);

  useEffect(() => {
    if (!statusError) return;
    const timer = setTimeout(() => setStatusError(null), 5000);
    return () => clearTimeout(timer);
  }, [statusError]);

  function resetForm() {
    setTitle("");
    setSeverity("medium");
    setPriority("medium");
    setSteps([""]);
    setExpectedResult("");
    setActualResult("");
    setDevice("");
    setBrowser("");
    setLabels([]);
    setShowDetails(false);
  }

  async function handleCreateBug(e: React.FormEvent) {
    e.preventDefault();
    if (!teamId) return;
    setFormError(null);

    const stepsToReproduce = steps.map((s) => s.trim()).filter(Boolean);

    try {
      await createBug(teamId, {
        title,
        severity,
        priority,
        stepsToReproduce: stepsToReproduce.length ? stepsToReproduce : undefined,
        expectedResult: expectedResult || undefined,
        actualResult: actualResult || undefined,
        environment: device || browser ? { device, browser } : undefined,
        labels: labels.length ? labels : undefined,
      });
      resetForm();
      setShowForm(false);
      await loadBoard();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create bug");
    }
  }

  async function changeBugStatus(bugId: string, newStatus: BugStatus) {
    const previousBugs = bugs;

    setBugs((prev) =>
      prev.map((b) => (b.id === bugId ? { ...b, status: newStatus } : b))
    );

    try {
      await updateBugStatus(bugId, newStatus);
      setStatusError(null);
    } catch (err) {
      setBugs(previousBugs);
      setStatusError(
        err instanceof Error ? err.message : "Status change failed"
      );
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const bugId = active.id as string;
    const newStatus = over.id as BugStatus;

    const bug = bugs.find((b) => b.id === bugId);
    if (!bug || bug.status === newStatus) return;

    if (!nextStatusOptions[bug.status].includes(newStatus)) {
      setStatusError(
        `Cannot move a bug from "${bug.status.replace("_", " ")}" to "${newStatus.replace("_", " ")}"`
      );
      return;
    }

    changeBugStatus(bugId, newStatus);
  }

  async function confirmDelete() {
    if (!bugToDelete) return;
    setDeleting(true);
    try {
      await deleteBug(bugToDelete.id);
      setBugToDelete(null);
      await loadBoard();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete bug");
    } finally {
      setDeleting(false);
    }
  }

  function getAssigneeName(userId: string | null): string | null {
    if (!userId) return null;
    const member = members.find((m) => m.userId === userId);
    return member ? member.name : null;
  }

  // Applies search + filters over the already-loaded bugs array.
  // Recomputed only when the inputs actually change, via useMemo.
  const filteredBugs = useMemo(() => {
    return bugs.filter((bug) => {
      if (
        searchText.trim() &&
        !bug.title.toLowerCase().includes(searchText.trim().toLowerCase())
      ) {
        return false;
      }
      if (severityFilter && bug.severity !== severityFilter) {
        return false;
      }
      if (assigneeFilter === "me" && bug.assignee !== currentUserId) {
        return false;
      }
      if (
        assigneeFilter &&
        assigneeFilter !== "me" &&
        bug.assignee !== assigneeFilter
      ) {
        return false;
      }
      return true;
    });
  }, [bugs, searchText, severityFilter, assigneeFilter, currentUserId]);

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

      {/* Search + filter toolbar — purely client-side over the loaded bugs */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="Search bugs..."
          className="input input-bordered input-sm w-48"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />

        <select
          className="select select-bordered select-sm"
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as BugSeverity | "")}
        >
          <option value="">All severities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>

        <select
          className="select select-bordered select-sm"
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
        >
          <option value="">All assignees</option>
          <option value="me">My bugs</option>
          {members.map((m) => (
            <option key={m.userId} value={m.userId}>
              {m.name}
            </option>
          ))}
        </select>

        {(searchText || severityFilter || assigneeFilter) && (
          <button
            onClick={() => {
              setSearchText("");
              setSeverityFilter("");
              setAssigneeFilter("");
            }}
            className="btn btn-ghost btn-sm"
          >
            Clear filters
          </button>
        )}
      </div>

      {statusError && (
        <div className="alert alert-error mb-4 py-2 text-sm shadow">
          <span>{statusError}</span>
          <button
            onClick={() => setStatusError(null)}
            className="btn btn-ghost btn-xs"
          >
            ✕
          </button>
        </div>
      )}

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

          <div>
            <label className="mb-1 block text-xs text-base-content/60">
              Labels
            </label>
            <LabelsInput labels={labels} onChange={setLabels} />
          </div>

          <button
            type="button"
            onClick={() => setShowDetails((prev) => !prev)}
            className="self-start text-xs text-primary hover:underline"
          >
            {showDetails ? "− Hide details" : "+ Add steps, expected/actual result, environment"}
          </button>

          {showDetails && (
            <div className="flex flex-col gap-4 rounded-lg bg-base-200 p-3">
              <div>
                <SectionLabel>Steps to reproduce</SectionLabel>
                <StepsInput steps={steps} onChange={setSteps} />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <SectionLabel>Expected result</SectionLabel>
                  <input
                    type="text"
                    className="input input-bordered w-full text-sm"
                    value={expectedResult}
                    onChange={(e) => setExpectedResult(e.target.value)}
                  />
                </div>
                <div>
                  <SectionLabel>Actual result</SectionLabel>
                  <input
                    type="text"
                    className="input input-bordered w-full text-sm"
                    value={actualResult}
                    onChange={(e) => setActualResult(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <SectionLabel>Environment</SectionLabel>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    className="input input-bordered w-full text-sm"
                    placeholder="Device (e.g. iPhone 14)"
                    value={device}
                    onChange={(e) => setDevice(e.target.value)}
                  />
                  <input
                    type="text"
                    className="input input-bordered w-full text-sm"
                    placeholder="Browser (e.g. Safari 17)"
                    value={browser}
                    onChange={(e) => setBrowser(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary self-start">
            Create
          </button>

          {formError && <p className="text-sm text-error">{formError}</p>}
        </form>
      )}

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {COLUMNS.map((col) => {
            const bugsInColumn = filteredBugs.filter(
              (b) => b.status === col.status
            );

            return (
              <DroppableColumn
                key={col.status}
                status={col.status}
                label={`${col.label} ${bugsInColumn.length}`}
              >
                {bugsInColumn.map((bug) => (
                  <DraggableBugCard
                    key={bug.id}
                    bug={bug}
                    assigneeName={getAssigneeName(bug.assignee)}
                    onOpen={() => navigate(`/bugs/${bug.id}`)}
                    onDelete={() => setBugToDelete(bug)}
                    onStatusChange={(newStatus) =>
                      changeBugStatus(bug.id, newStatus)
                    }
                  />
                ))}
              </DroppableColumn>
            );
          })}
        </div>
      </DndContext>

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