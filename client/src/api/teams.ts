import { apiFetch } from "./client";

// Shape of a team as returned by GET /teams — matches the backend's
// getMyTeams controller response (id, name, key, role)
export interface Team {
  id: string;
  name: string;
  key: string;
  role: "admin" | "developer" | "qa";
}

// Fetches only the teams the logged-in user belongs to.
// apiFetch automatically attaches the JWT from localStorage.
export function getMyTeams() {
  return apiFetch<{ teams: Team[] }>("/teams");
}

// Creates a new team — the backend automatically makes the
// logged-in user an "admin" member of it.
export function createTeam(name: string, key: string) {
  return apiFetch<{ team: { id: string; name: string; key: string } }>(
    "/teams",
    {
      method: "POST",
      body: JSON.stringify({ name, key }),
    }
  );
}