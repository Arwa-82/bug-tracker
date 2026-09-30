import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getBug,
  updateBugStatus,
  uploadBugAttachment,
  deleteBugAttachment,
} from "../api/bugs";
import type { Bug, BugStatus } from "../api/bugs";
import {
  getBugComments,
  addBugComment,
  deleteComment,
} from "../api/comments";
import type { Comment } from "../api/comments";

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

// A single shape for "what's pending deletion", so one modal can handle
// both attachments and comments instead of writing two nearly-identical ones.
type PendingDelete =
  | { type: "attachment"; index: number; label: string }
  | { type: "comment"; id: string; label: string };

export default function BugDetailPage() {
  const { bugId } = useParams<{ bugId: string }>();

  const [bug, setBug] = useState<Bug | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Whatever's currently targeted for deletion — drives the confirm modal.
  // null means the modal is closed.
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);

  async function loadData() {
    if (!bugId) return;
    setLoading(true);
    setPageError(null);
    try {
      const [bugRes, commentsRes] = await Promise.all([
        getBug(bugId),
        getBugComments(bugId),
      ]);
      setBug(bugRes.bug);
      setComments(commentsRes.comments);
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
    try {
      const res = await updateBugStatus(bug.id, newStatus);
      setBug(res.bug);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Status change failed");
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
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // Runs when the user confirms deletion in the modal — branches based
  // on whether it's an attachment or a comment being deleted.
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
      setPendingDelete(null); // closes the modal
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
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

  if (pageError || !bug) {
    return <div className="p-6 text-error">{pageError || "Bug not found"}</div>;
  }

  const backendOrigin = import.meta.env.VITE_API_URL.replace(/\/api$/, "");

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        to={`/teams/${bug.team}/board`}
        className="mb-4 inline-block text-sm text-primary hover:underline"
      >
        &larr; Back to board
      </Link>

      {/* Bug header */}
      <div className="card mb-4 bg-base-100 p-5 shadow">
        <div className="mb-2 flex items-start justify-between gap-4">
          <h1 className="text-xl font-semibold">{bug.title}</h1>
          <span className={`badge ${severityBadge[bug.severity]}`}>
            {bug.severity}
          </span>
        </div>

        <p className="mb-3 text-sm text-base-content/70">
          Status: <span className="font-medium">{bug.status}</span>
        </p>

        <select
          className="select select-bordered select-sm w-fit"
          value=""
          onChange={(e) => handleStatusChange(e.target.value as BugStatus)}
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

        {bug.description && (
          <p className="mt-4 text-sm">{bug.description}</p>
        )}
      </div>

      {/* Attachments section */}
      <div className="card mb-4 bg-base-100 p-5 shadow">
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

      {/* Comments section */}
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

      {/* Shared delete confirmation modal — handles both attachments
          and comments, text adjusts based on pendingDelete.type */}
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
                <>
                  This comment will be permanently removed. This action
                  cannot be undone.
                </>
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
    </div>
  );
}