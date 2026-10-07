import { apiFetch } from "./client";

// Shape of a team as returned by GET /teams — matches the backend's
// getMyTeams controller response (id, name, key, role)
export interface Team {
  id: string;
  name: string;
  key: string;
  role: "admin" | "developer" | "qa";
}

// Shape of one member as returned by GET /teams/:teamId/members
export interface Member {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  role: "admin" | "developer" | "qa";
}

// Fetches only the teams the logged-in user belongs to
export function getMyTeams() {
  return apiFetch<{ teams: Team[] }>("/teams");
}

// Creates a new team — the backend automatically makes the
// logged-in user an "admin" member of it
export function createTeam(name: string, key: string) {
  return apiFetch<{ team: { id: string; name: string; key: string } }>(
    "/teams",
    {
      method: "POST",
      body: JSON.stringify({ name, key }),
    }
  );
}

// Fetches all members of a team, with their roles
export function getTeamMembers(teamId: string) {
  return apiFetch<{ members: Member[] }>(`/teams/${teamId}/members`);
}

// Adds an existing user to a team by their email address
export function addMember(
  teamId: string,
  email: string,
  role: "admin" | "developer" | "qa"
) {
  return apiFetch<{ membership: unknown }>(`/teams/${teamId}/members`, {
    method: "POST",
    body: JSON.stringify({ email, role }),
  });
}

// Changes an existing member's role
export function updateMemberRole(
  teamId: string,
  userId: string,
  role: "admin" | "developer" | "qa"
) {
  return apiFetch<{ membership: unknown }>(
    `/teams/${teamId}/members/${userId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }
  );
}

// Removes a member from a team entirely
export function removeMember(teamId: string, userId: string) {
  return apiFetch<{ message: string }>(`/teams/${teamId}/members/${userId}`, {
    method: "DELETE",
  });
}
// Already defined getTeamMembers earlier for Team Settings — reusing it
// here in BugDetailPage.tsx as well, no change needed if it's already there.