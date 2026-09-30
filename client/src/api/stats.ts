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