import type { Activity } from "../api/activity";

interface ActivityTimelineProps {
  activity: Activity[];
}

// Converts a raw activity entry into a human-readable sentence,
// e.g. "Mobile Admin changed status from open to in_progress"
function describeActivity(entry: Activity): string {
  const name = entry.actor.name;

  switch (entry.action) {
    case "status_changed":
      return `${name} changed status from "${entry.meta.from}" to "${entry.meta.to}"`;
    case "assigned":
      return `${name} assigned this bug`;
    case "unassigned":
      return `${name} unassigned this bug`;
    case "comment_added":
      return `${name} added a comment`;
    case "attachment_added":
      return `${name} uploaded "${entry.meta.filename}"`;
    case "attachment_removed":
      return `${name} removed "${entry.meta.filename}"`;
    case "bug_updated": {
      const fields = Array.isArray(entry.meta.fields)
        ? (entry.meta.fields as string[]).join(", ")
        : "details";
      return `${name} updated ${fields}`;
    }
    default:
      return `${name} made a change`;
  }
}

// Formats a timestamp as a short relative time, e.g. "2h ago", "3d ago" —
// falls back to a plain date for anything older than a week, since
// "14d ago" is less useful than an actual date at that point.
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function ActivityTimeline({ activity }: ActivityTimelineProps) {
  if (activity.length === 0) {
    return (
      <p className="text-sm text-base-content/50">No activity yet.</p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {activity.map((entry) => (
        <div key={entry.id} className="flex items-start gap-2 text-sm">
          {/* Small dot, purely decorative timeline marker */}
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-base-content/30" />
          <div>
            <p>{describeActivity(entry)}</p>
            <p className="text-xs text-base-content/40">
              {formatRelativeTime(entry.createdAt)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}