import { apiFetch } from "./client";

// Shape of the response from GET /teams/:teamId/stats
export interface TeamStats {
  total: number;
  open: number;
  byStatus: Record<string, number>;
  bySeverity: Record<string, number>;
}

export function getTeamStats(teamId: string) {
  return apiFetch<TeamStats>(`/teams/${teamId}/stats`);
}
export interface SprintReport {
  startDate: string;
  endDate: string;
  createdCount: number;
  resolvedCount: number;
  createdBySeverity: Record<string, number>;
  resolvedBySeverity: Record<string, number>;
  stillOpen: number;
}

export function getSprintReport(teamId: string, startDate: string, endDate: string) {
  return apiFetch<SprintReport>(
    `/teams/${teamId}/sprint-report?startDate=${startDate}&endDate=${endDate}`
  );
}