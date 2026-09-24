import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  getBug,
  updateBugStatus,
  uploadBugAttachment,
} from "../api/bugs";
import type { Bug, BugStatus } from "../api/bugs";
import { getBugComments, addBugComment } from "../api/comments";
import type { Comment } from "../api/comments";

// Mirrors the backend's statusWorkflow.ts — only these transitions are allowed.
// Kept in sync manually for now; the backend is still the source of truth
// and will reject anything not listed here anyway.
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

export default function BugDetailPage() {
  // bugId comes from the URL — this page will be mounted at /bugs/:bugId
  const { bugId } = useParams<{ bugId: string }>();

  const [bug, setBug] = useState<Bug | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // New comment form state
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  // File upload state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Ref lets us trigger the hidden file input from a styled button
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Loads both the bug details and its comments together
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
      setBug(res.bug); // update local state with the new status
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
      // Append the new comment to the end of the list instead of
      // re-fetching everything — faster, and keeps scroll position
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
      setBug(res.bug); // backend returns the full bug with the new attachment included
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      // Reset the input so selecting the same file again still fires onChange
      if (fileInputRef.current) fileInputRef.current.value = "";
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

  // Backend base URL (without "/api") — needed to build a full image/video src,
  // since the bug's attachment url is a relative path like "/uploads/xyz.png"
  const backendOrigin = import.meta.env.VITE_API_URL.replace(/\/api$/, "");

  return (
    <div className="mx-auto max-w-3xl">
      {/* Breadcrumb back to the board */}
      <Link
        to={`/teams/${bug.team}/board`}
        className="mb-4 inline-block text-sm text-primary hover:underline"
      >
        &larr; Back to board
      </Link>

      {/* Bug header: title, severity, status control */}
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

        {/* Status transition dropdown — same pattern as the board */}
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

          {/* Hidden native file input, triggered by the visible button below.
              accept="image/*,video/*" matches the backend's fileFilter */}
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
              <a
                key={i}
                href={`${backendOrigin}${att.url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block overflow-hidden rounded-lg border border-base-300"
              >
                {/* Render an <img> for images, a <video> for videos,
                    based on the mimetype the backend stored */}
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
              <div key={c.id} className="rounded-lg bg-base-200 p-3">
                <p className="text-xs font-medium">{c.author.name}</p>
                <p className="text-sm">{c.text}</p>
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
    </div>
  );
}