import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getTeamStats } from "../api/stats";
import type { TeamStats } from "../api/stats";

// Display order and colors for the status breakdown bars.
// DaisyUI badge/progress color classes chosen to roughly match
// the teal/coral theme — teal for "good" states, coral for urgent ones.
const STATUS_ORDER = [
  { key: "open", label: "Open", color: "bg-error" },
  { key: "in_progress", label: "In Progress", color: "bg-warning" },
  { key: "fixed", label: "Fixed", color: "bg-info" },
  { key: "verified", label: "Verified", color: "bg-success" },
  { key: "closed", label: "Closed", color: "bg-neutral" },
  { key: "reopened", label: "Reopened", color: "bg-error" },
];

const SEVERITY_ORDER = [
  { key: "critical", label: "Critical", color: "bg-error" },
  { key: "high", label: "High", color: "bg-warning" },
  { key: "medium", label: "Medium", color: "bg-warning opacity-60" },
  { key: "low", label: "Low", color: "bg-neutral" },
];

export default function TeamDashboardPage() {
  const { teamId } = useParams<{ teamId: string }>();

  const [stats, setStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) return;

    async function loadStats() {
      setLoading(true);
      setPageError(null);
      try {
        const res = await getTeamStats(teamId);
        setStats(res);
      } catch (err) {
        setPageError(
          err instanceof Error ? err.message : "Failed to load stats"
        );
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [teamId]);

  if (loading) {
    return (
      <div className="flex justify-center p-10">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (pageError || !stats) {
    return <div className="p-6 text-error">{pageError || "No data"}</div>;
  }

  // Used to size each bar in the breakdown proportionally to the total.
  // Avoids a divide-by-zero when a team has no bugs yet.
  const maxCount = Math.max(stats.total, 1);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-lg font-medium">Dashboard</h1>

      {/* Headline stat cards */}
      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="card bg-base-100 p-4 shadow">
          <p className="text-xs text-base-content/60">Total bugs</p>
          <p className="text-2xl font-semibold">{stats.total}</p>
        </div>
        <div className="card bg-base-100 p-4 shadow">
          <p className="text-xs text-base-content/60">Open</p>
          <p className="text-2xl font-semibold text-error">{stats.open}</p>
        </div>
        <div className="card bg-base-100 p-4 shadow">
          <p className="text-xs text-base-content/60">Critical</p>
          <p className="text-2xl font-semibold text-error">
            {stats.bySeverity.critical || 0}
          </p>
        </div>
      </div>

      {/* Status breakdown */}
      <div className="card mb-6 bg-base-100 p-5 shadow">
        <h2 className="mb-3 text-sm font-medium text-base-content/70">
          By status
        </h2>
        <div className="flex flex-col gap-2">
          {STATUS_ORDER.map((s) => {
            const count = stats.byStatus[s.key] || 0;
            const widthPercent = (count / maxCount) * 100;

            return (
              <div key={s.key} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-xs text-base-content/70">
                  {s.label}
                </span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-base-200">
                  <div
                    className={`h-full ${s.color}`}
                    style={{ width: `${widthPercent}%` }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right text-xs text-base-content/70">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Severity breakdown */}
      <div className="card bg-base-100 p-5 shadow">
        <h2 className="mb-3 text-sm font-medium text-base-content/70">
          By severity
        </h2>
        <div className="flex flex-col gap-2">
          {SEVERITY_ORDER.map((s) => {
            const count = stats.bySeverity[s.key] || 0;
            const widthPercent = (count / maxCount) * 100;

            return (
              <div key={s.key} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-xs text-base-content/70">
                  {s.label}
                </span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-base-200">
                  <div
                    className={`h-full ${s.color}`}
                    style={{ width: `${widthPercent}%` }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right text-xs text-base-content/70">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}