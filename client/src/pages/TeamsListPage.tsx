import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyTeams, createTeam } from "../api/teams";
import type { Team } from "../api/teams";

export default function TeamsListPage() {
  // Holds the list of teams once fetched — starts empty
  const [teams, setTeams] = useState<Team[]>([]);

  // Tracks the initial fetch so we can show a spinner instead of
  // a flash of "no teams" before the real data arrives
  const [loading, setLoading] = useState(true);

  // Controls whether the "create team" form is visible
  const [showForm, setShowForm] = useState(false);

  // Form field state for creating a new team
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Pulls the user's teams from the backend. Reused after creating
  // a new team so the list refreshes without a full page reload.
  async function loadTeams() {
    setLoading(true);
    try {
      const res = await getMyTeams();
      setTeams(res.teams);
    } finally {
      setLoading(false);
    }
  }

  // Runs once when the page first mounts
  useEffect(() => {
    loadTeams();
  }, []);

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await createTeam(name, key);
      setName("");
      setKey("");
      setShowForm(false);
      await loadTeams(); // refresh the list to include the new team
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create team");
    } finally {
      setSubmitting(false);
    }
  }

  // Show a spinner while the initial fetch is in flight
  if (loading) {
    return (
      <div className="flex justify-center p-10">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-medium">Your teams</h1>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setShowForm((prev) => !prev)}
        >
          {showForm ? "Cancel" : "Create team"}
        </button>
      </div>

      {/* Inline create-team form, toggled by the button above */}
      {showForm && (
        <form
          onSubmit={handleCreateTeam}
          className="card mb-6 bg-base-100 p-4 shadow"
        >
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Team name (e.g. Mobile Team)"
              className="input input-bordered flex-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Key (e.g. MOB)"
              className="input input-bordered w-32"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              required
              maxLength={6}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? "Creating..." : "Create"}
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-error">{error}</p>}
        </form>
      )}

      {/* Empty state — shown only when the fetch finished and there are no teams */}
      {teams.length === 0 ? (
        <p className="text-sm text-base-content/60">
          No teams yet — create one to get started.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {teams.map((team) => (
            <Link
              key={team.id}
              to={`/teams/${team.id}/board`}
              className="card bg-base-100 p-4 shadow transition hover:shadow-md"
            >
              <p className="font-medium">{team.name}</p>
              <p className="text-xs text-base-content/60">
                {team.key} · {team.role}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}