import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getBug,
  updateBug,
  updateBugStatus,
  uploadBugAttachment,
  deleteBugAttachment,
  assignBug,
  getLinkedBugs,
  unlinkBug,
} from "../api/bugs";
import type { Bug, BugStatus, BugSeverity, BugPriority, BugWithTeam } from "../api/bugs";
import {
  getBugComments,
  addBugComment,
  deleteComment,
} from "../api/comments";
import type { Comment } from "../api/comments";
import { getTeamMembers } from "../api/teams";
import type { Member } from "../api/teams";
import { getBugActivity } from "../api/activity";
import type { Activity } from "../api/activity";
import ActivityTimeline from "../components/ActivityTimeline";
import StepsInput from "../components/StepsInput";
import LabelsInput from "../components/LabelsInput";
import LinkBugPicker from "../components/LinkBugPicker";

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

type PendingDelete =
  | { type: "attachment"; index: number; label: string }
  | { type: "comment"; id: string; label: string };

function stripLeadingNumber(step: string): string {
  return step.replace(/^\s*\d+\s*[\.\-\)]\s*/, "");
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-1.5 border-l-[3px] border-[#7C3AED] pl-2.5 text-xs font-bold uppercase tracking-wide text-[#7C3AED]">
      {children}
    </h3>
  );
}

export default function BugDetailPage() {
  const { bugId } = useParams<{ bugId: string }>();

  const [bug, setBug] = useState<Bug | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [linkedBugs, setLinkedBugs] = useState<BugWithTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);

  const [assigning, setAssigning] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [changingSeverity, setChangingSeverity] = useState(false);
  const [changingPriority, setChangingPriority] = useState(false);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);

  const [editingDetails, setEditingDetails] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [draftSteps, setDraftSteps] = useState<string[]>([""]);
  const [draftExpected, setDraftExpected] = useState("");
  const [draftActual, setDraftActual] = useState("");
  const [draftDevice, setDraftDevice] = useState("");
  const [draftBrowser, setDraftBrowser] = useState("");
  const [draftLabels, setDraftLabels] = useState<string[]>([]);

  const [showLinkPicker, setShowLinkPicker] = useState(false);
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

  async function loadData() {
    if (!bugId) return;
    setLoading(true);
    setPageError(null);
    try {
      const bugRes = await getBug(bugId);
      setBug(bugRes.bug);

      const [commentsRes, membersRes, activityRes, linkedRes] = await Promise.all([
        getBugComments(bugId),
        getTeamMembers(bugRes.bug.team),
        getBugActivity(bugId),
        getLinkedBugs(bugId),
      ]);
      setComments(commentsRes.comments);
      setMembers(membersRes.members);
      setActivity(activityRes.activity);
      setLinkedBugs(linkedRes.linkedBugs);
    } catch (err) {
      setPageError(err instanceof Error ? err.message : "Failed to load bug");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [bugId]);

  async function handleStatusChange(newStatus: BugStatus) {
    if (!bug) return;
    setChangingStatus(true);
    try {
      const res = await updateBugStatus(bug.id, newStatus);
      setBug(res.bug);
      const activityRes = await getBugActivity(bug.id);
      setActivity(activityRes.activity);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Status change failed");
    } finally {
      setChangingStatus(false);
    }
  }

  async function handleAssigneeChange(userId: string) {
    if (!bug) return;
    setAssigning(true);
    try {
      const res = await assignBug(bug.id, userId || null);
      setBug(res.bug);
      const activityRes = await getBugActivity(bug.id);
      setActivity(activityRes.activity);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update assignee");
    } finally {
      setAssigning(false);
    }
  }

  async function handleSeverityChange(value: BugSeverity) {
    if (!bug) return;
    setChangingSeverity(true);
    try {
      const res = await updateBug(bug.id, { severity: value });
      setBug(res.bug);
      const activityRes = await getBugActivity(bug.id);
      setActivity(activityRes.activity);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update severity");
    } finally {
      setChangingSeverity(false);
    }
  }

  async function handlePriorityChange(value: BugPriority) {
    if (!bug) return;
    setChangingPriority(true);
    try {
      const res = await updateBug(bug.id, { priority: value });
      setBug(res.bug);
      const activityRes = await getBugActivity(bug.id);
      setActivity(activityRes.activity);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update priority");
    } finally {
      setChangingPriority(false);
    }
  }

  function startEditingTitle() {
    if (!bug) return;
    setTitleDraft(bug.title);
    setEditingTitle(true);
  }

  async function saveTitle() {
    if (!bug || !titleDraft.trim() || titleDraft === bug.title) {
      setEditingTitle(false);
      return;
    }
    setSavingTitle(true);
    try {
      const res = await updateBug(bug.id, { title: titleDraft.trim() });
      setBug(res.bug);
      setEditingTitle(false);
      const activityRes = await getBugActivity(bug.id);
      setActivity(activityRes.activity);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update title");
    } finally {
      setSavingTitle(false);
    }
  }

  function handleTitleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") saveTitle();
    if (e.key === "Escape") setEditingTitle(false);
  }

  function startEditingDetails() {
    if (!bug) return;
    setDraftSteps(bug.stepsToReproduce.length ? bug.stepsToReproduce : [""]);
    setDraftExpected(bug.expectedResult);
    setDraftActual(bug.actualResult);
    setDraftDevice(bug.environment?.device || "");
    setDraftBrowser(bug.environment?.browser || "");
    setDraftLabels(bug.labels);
    setEditingDetails(true);
  }

  async function saveDetails() {
    if (!bug) return;
    setSavingDetails(true);
    try {
      const stepsToReproduce = draftSteps
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await updateBug(bug.id, {
        stepsToReproduce,
        expectedResult: draftExpected,
        actualResult: draftActual,
        environment: { device: draftDevice, browser: draftBrowser },
        labels: draftLabels,
      });
      setBug(res.bug);
      setEditingDetails(false);
      const activityRes = await getBugActivity(bug.id);
      setActivity(activityRes.activity);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update details");
    } finally {
      setSavingDetails(false);
    }
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!bugId || !commentText.trim()) return;

    setPostingComment(true);
    try {
      const res = await addBugComment(bugId, commentText);
      setComments((prev) => [...prev, res.comment]);
      setCommentText("");
      const activityRes = await getBugActivity(bugId);
      setActivity(activityRes.activity);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add comment");
    } finally {
      setPostingComment(false);
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !bugId) return;

    setUploadError(null);
    setUploading(true);
    try {
      const res = await uploadBugAttachment(bugId, file);
      setBug(res.bug);
      const activityRes = await getBugActivity(bugId);
      setActivity(activityRes.activity);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function confirmDelete() {
    if (!pendingDelete || !bug) return;
    setDeleting(true);
    try {
      if (pendingDelete.type === "attachment") {
        const res = await deleteBugAttachment(bug.id, pendingDelete.index);
        setBug(res.bug);
      } else {
        await deleteComment(pendingDelete.id);
        setComments((prev) => prev.filter((c) => c.id !== pendingDelete.id));
      }
      setPendingDelete(null);
      const activityRes = await getBugActivity(bug.id);
      setActivity(activityRes.activity);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  async function handleUnlink(linkedBugId: string) {
    if (!bug) return;
    setUnlinkingId(linkedBugId);
    try {
      await unlinkBug(bug.id, linkedBugId);
      setLinkedBugs((prev) => prev.filter((b) => b.id !== linkedBugId));
      const activityRes = await getBugActivity(bug.id);
      setActivity(activityRes.activity);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to unlink");
    } finally {
      setUnlinkingId(null);
    }
  }

  async function refreshLinkedBugs() {
    if (!bugId) return;
    const res = await getLinkedBugs(bugId);
    setLinkedBugs(res.linkedBugs);
  }

  if (loading) {
    return (
      <div className="flex justify-center p-10">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (pageError || !bug) {
    return <div className="p-6 text-error">{pageError || "Bug not found"}</div>;
  }

  const backendOrigin = import.meta.env.VITE_API_URL.replace(/\/api$/, "");
  const hasEnvironment = bug.environment?.device || bug.environment?.browser;
  const assigneeName =
    members.find((m) => m.userId === bug.assignee)?.name || null;

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        to={`/teams/${bug.team}/board`}
        className="mb-4 inline-block text-sm text-primary hover:underline"
      >
        &larr; Back to board
      </Link>

      <div className="mb-4">
        {editingTitle ? (
          <input
            type="text"
            autoFocus
            className="input input-bordered w-full text-xl font-semibold"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={handleTitleKeyDown}
            disabled={savingTitle}
          />
        ) : (
          <h1
            onClick={startEditingTitle}
            className="cursor-text rounded px-1 text-xl font-semibold hover:bg-base-200"
            title="Click to edit"
          >
            {bug.title}
          </h1>
        )}
      </div>

      {!editingTitle && bug.labels.length > 0 && (
        <div className="mb-4 -mt-2 flex flex-wrap gap-1.5 px-1">
          {bug.labels.map((label) => (
            <span key={label} className="badge badge-ghost badge-sm">
              {label}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          {bug.description && (
            <div className="card bg-base-100 p-5 shadow">
              <h2 className="mb-2 text-sm font-medium text-base-content/60">
                Description
              </h2>
              <p className="text-sm">{bug.description}</p>
            </div>
          )}

          <div className="card bg-base-100 p-5 shadow">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-medium">Details</h2>
              {!editingDetails && (
                <button
                  onClick={startEditingDetails}
                  className="btn btn-ghost btn-xs"
                >
                  Edit
                </button>
              )}
            </div>

            {editingDetails ? (
              <div className="flex flex-col gap-4">
                <div>
                  <SectionLabel>Steps to reproduce</SectionLabel>
                  <StepsInput steps={draftSteps} onChange={setDraftSteps} />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <SectionLabel>Expected result</SectionLabel>
                    <input
                      type="text"
                      className="input input-bordered w-full text-sm"
                      value={draftExpected}
                      onChange={(e) => setDraftExpected(e.target.value)}
                    />
                  </div>
                  <div>
                    <SectionLabel>Actual result</SectionLabel>
                    <input
                      type="text"
                      className="input input-bordered w-full text-sm"
                      value={draftActual}
                      onChange={(e) => setDraftActual(e.target.value)}
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
                      value={draftDevice}
                      onChange={(e) => setDraftDevice(e.target.value)}
                    />
                    <input
                      type="text"
                      className="input input-bordered w-full text-sm"
                      placeholder="Browser (e.g. Safari 17)"
                      value={draftBrowser}
                      onChange={(e) => setDraftBrowser(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <SectionLabel>Labels</SectionLabel>
                  <LabelsInput labels={draftLabels} onChange={setDraftLabels} />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={saveDetails}
                    className="btn btn-primary btn-sm"
                    disabled={savingDetails}
                  >
                    {savingDetails ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => setEditingDetails(false)}
                    className="btn btn-ghost btn-sm"
                    disabled={savingDetails}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {bug.stepsToReproduce.length > 0 && (
                  <div>
                    <SectionLabel>Steps to reproduce</SectionLabel>
                    <ol className="list-inside list-decimal space-y-1 pl-0.5 text-sm">
                      {bug.stepsToReproduce.map((step, i) => (
                        <li key={i}>{stripLeadingNumber(step)}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {(bug.expectedResult || bug.actualResult) && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <SectionLabel>Expected result</SectionLabel>
                      <p className="pl-0.5 text-sm">
                        {bug.expectedResult || (
                          <span className="text-base-content/40">—</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <SectionLabel>Actual result</SectionLabel>
                      <p className="pl-0.5 text-sm">
                        {bug.actualResult || (
                          <span className="text-base-content/40">—</span>
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {hasEnvironment && (
                  <div>
                    <SectionLabel>Environment</SectionLabel>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 pl-0.5 text-sm">
                      {bug.environment.device && (
                        <span>
                          <span className="text-base-content/50">Device:</span>{" "}
                          {bug.environment.device}
                        </span>
                      )}
                      {bug.environment.browser && (
                        <span>
                          <span className="text-base-content/50">Browser:</span>{" "}
                          {bug.environment.browser}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {bug.stepsToReproduce.length === 0 &&
                  !bug.expectedResult &&
                  !bug.actualResult &&
                  !hasEnvironment && (
                    <p className="text-sm text-base-content/50">
                      No additional details yet.
                    </p>
                  )}
              </div>
            )}
          </div>

          <div className="card bg-base-100 p-5 shadow">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-medium">Attachments</h2>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={handleFileSelected}
              />
              <button
                className="btn btn-sm btn-primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Upload image/video"}
              </button>
            </div>

            {uploadError && (
              <p className="mb-2 text-sm text-error">{uploadError}</p>
            )}

            {bug.attachments.length === 0 ? (
              <p className="text-sm text-base-content/60">No attachments yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {bug.attachments.map((att, i) => (
                  <div key={i} className="relative">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setPendingDelete({
                          type: "attachment",
                          index: i,
                          label: att.filename,
                        });
                      }}
                      className="absolute right-1 top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white hover:bg-error"
                      title="Delete attachment"
                    >
                      ✕
                    </button>
                    <a
                      href={`${backendOrigin}${att.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block overflow-hidden rounded-lg border border-base-300"
                    >
                      {att.mimetype.startsWith("image/") ? (
                        <img
                          src={`${backendOrigin}${att.url}`}
                          alt={att.filename}
                          className="h-24 w-full object-cover"
                        />
                      ) : (
                        <video
                          src={`${backendOrigin}${att.url}`}
                          className="h-24 w-full object-cover"
                          muted
                        />
                      )}
                      <p className="truncate p-1 text-xs">{att.filename}</p>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Linked issues — can span across teams. Only shows bugs on
              teams the current user can actually access. */}
          <div className="card bg-base-100 p-5 shadow">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-medium">Linked issues</h2>
              <button
                onClick={() => setShowLinkPicker(true)}
                className="btn btn-ghost btn-xs"
              >
                + Link bug
              </button>
            </div>

            {linkedBugs.length === 0 ? (
              <p className="text-sm text-base-content/60">
                No linked issues yet.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {linkedBugs.map((lb) => (
                  <div
                    key={lb.id}
                    className="flex items-center justify-between rounded-lg bg-base-200 p-2.5"
                  >
                    <Link
                      to={`/bugs/${lb.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {lb.title}
                      <span className="ml-2 text-xs font-normal text-base-content/50">
                        {lb.team.name} ({lb.team.key})
                      </span>
                    </Link>
                    <button
                      onClick={() => handleUnlink(lb.id)}
                      disabled={unlinkingId === lb.id}
                      className="text-base-content/40 hover:text-error"
                      title="Remove link"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card bg-base-100 p-5 shadow">
            <h2 className="mb-3 font-medium">Comments</h2>
            <div className="mb-4 flex flex-col gap-3">
              {comments.length === 0 ? (
                <p className="text-sm text-base-content/60">No comments yet.</p>
              ) : (
                comments.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-start justify-between gap-2 rounded-lg bg-base-200 p-3"
                  >
                    <div>
                      <p className="text-xs font-medium">{c.author.name}</p>
                      <p className="text-sm">{c.text}</p>
                    </div>
                    <button
                      onClick={() =>
                        setPendingDelete({
                          type: "comment",
                          id: c.id,
                          label: c.text,
                        })
                      }
                      className="shrink-0 text-base-content/40 hover:text-error"
                      title="Delete comment"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                type="text"
                className="input input-bordered flex-1"
                placeholder="Add a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={postingComment || !commentText.trim()}
              >
                {postingComment ? "Posting..." : "Post"}
              </button>
            </form>
          </div>

          {/* Activity timeline — read-only history of changes to this bug */}
          <div className="card bg-base-100 p-5 shadow">
            <h2 className="mb-3 font-medium">Activity</h2>
            <ActivityTimeline activity={activity} />
          </div>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="card flex flex-col gap-4 bg-base-100 p-5 shadow">
            <div>
              <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-base-content/50">
                Status
              </h3>
              <p className="mb-2 text-sm font-medium">{bug.status}</p>
              <select
                className="select select-bordered select-sm w-full"
                value=""
                onChange={(e) => handleStatusChange(e.target.value as BugStatus)}
                disabled={changingStatus}
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

            <div className="border-t border-base-200 pt-4">
              <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-base-content/50">
                Assignee
              </h3>
              <select
                className="select select-bordered select-sm w-full"
                value={bug.assignee || ""}
                onChange={(e) => handleAssigneeChange(e.target.value)}
                disabled={assigning}
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="border-t border-base-200 pt-4">
              <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-base-content/50">
                Severity
              </h3>
              <select
                className="select select-bordered select-sm w-full"
                value={bug.severity}
                onChange={(e) =>
                  handleSeverityChange(e.target.value as BugSeverity)
                }
                disabled={changingSeverity}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              <span
                className={`badge badge-sm mt-2 ${severityBadge[bug.severity]}`}
              >
                {bug.severity}
              </span>
            </div>

            <div className="border-t border-base-200 pt-4">
              <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-base-content/50">
                Priority
              </h3>
              <select
                className="select select-bordered select-sm w-full"
                value={bug.priority}
                onChange={(e) =>
                  handlePriorityChange(e.target.value as BugPriority)
                }
                disabled={changingPriority}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            {assigneeName && (
              <div className="border-t border-base-200 pt-4 text-xs text-base-content/50">
                Assigned to{" "}
                <span className="font-medium text-base-content">
                  {assigneeName}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {pendingDelete && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="text-lg font-semibold">
              {pendingDelete.type === "attachment"
                ? "Delete this attachment?"
                : "Delete this comment?"}
            </h3>
            <p className="py-3 text-sm text-base-content/70">
              {pendingDelete.type === "attachment" ? (
                <>
                  <span className="font-medium text-base-content">
                    "{pendingDelete.label}"
                  </span>{" "}
                  will be permanently removed from this bug. This action
                  cannot be undone.
                </>
              ) : (
                <>This comment will be permanently removed. This action cannot be undone.</>
              )}
            </p>
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => setPendingDelete(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="btn btn-error"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
          <div
            className="modal-backdrop"
            onClick={() => !deleting && setPendingDelete(null)}
          />
        </div>
      )}

      {showLinkPicker && bug && (
        <LinkBugPicker
          currentBugId={bug.id}
          onLinked={refreshLinkedBugs}
          onClose={() => setShowLinkPicker(false)}
        />
      )}
    </div>
  );
}