import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getTeamStats, getSprintReport } from "../api/stats";
import type { TeamStats, SprintReport } from "../api/stats";

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

// Formats a Date as YYYY-MM-DD for the date input's value attribute
function toDateInputValue(date: Date): string {
  return date.toISOString().split("T")[0];
}

export default function TeamDashboardPage() {
  const { teamId } = useParams<{ teamId: string }>();

  const [stats, setStats] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // Sprint report date range — defaults to the last 14 days, a
  // reasonable default sprint length
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return toDateInputValue(d);
  });
  const [endDate, setEndDate] = useState(() => toDateInputValue(new Date()));
  const [report, setReport] = useState<SprintReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) return;

    async function loadStats() {
      setLoading(true);
      setPageError(null);
      try {
        const res = await getTeamStats(teamId!);
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

  async function handleGenerateReport() {
    if (!teamId) return;
    setLoadingReport(true);
    setReportError(null);
    try {
      const res = await getSprintReport(teamId, startDate, endDate);
      setReport(res);
    } catch (err) {
      setReportError(
        err instanceof Error ? err.message : "Failed to load sprint report"
      );
    } finally {
      setLoadingReport(false);
    }
  }

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

  const maxCount = Math.max(stats.total, 1);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-lg font-medium">Dashboard</h1>

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

      <div className="card mb-6 bg-base-100 p-5 shadow">
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

      {/* Sprint report — date range picker + generated summary */}
      <div className="card bg-base-100 p-5 shadow">
        <h2 className="mb-3 text-sm font-medium text-base-content/70">
          Sprint report
        </h2>

        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs text-base-content/60">
              Start date
            </label>
            <input
              type="date"
              className="input input-bordered input-sm"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-base-content/60">
              End date
            </label>
            <input
              type="date"
              className="input input-bordered input-sm"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <button
            onClick={handleGenerateReport}
            className="btn btn-primary btn-sm"
            disabled={loadingReport}
          >
            {loadingReport ? "Generating..." : "Generate report"}
          </button>
        </div>

        {reportError && (
          <p className="mb-3 text-sm text-error">{reportError}</p>
        )}

        {report && (
          <div className="flex flex-col gap-4 border-t border-base-200 pt-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-base-content/60">Created</p>
                <p className="text-xl font-semibold">{report.createdCount}</p>
              </div>
              <div>
                <p className="text-xs text-base-content/60">Resolved</p>
                <p className="text-xl font-semibold text-success">
                  {report.resolvedCount}
                </p>
              </div>
              <div>
                <p className="text-xs text-base-content/60">Still open</p>
                <p className="text-xl font-semibold text-error">
                  {report.stillOpen}
                </p>
              </div>
            </div>

            {Object.keys(report.createdBySeverity).length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-base-content/60">
                  Created by severity
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(report.createdBySeverity).map(
                    ([sev, count]) => (
                      <span key={sev} className="badge badge-sm">
                        {sev}: {count}
                      </span>
                    )
                  )}
                </div>
              </div>
            )}

            {Object.keys(report.resolvedBySeverity).length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-base-content/60">
                  Resolved by severity
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(report.resolvedBySeverity).map(
                    ([sev, count]) => (
                      <span key={sev} className="badge badge-success badge-sm">
                        {sev}: {count}
                      </span>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}