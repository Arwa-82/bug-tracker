import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getTeamMembers,
  addMember,
  updateMemberRole,
  removeMember,
} from "../api/teams";
import type { Member } from "../api/teams";

type Role = "admin" | "developer" | "qa";

export default function TeamSettingsPage() {
  // teamId comes from the URL, e.g. /teams/:teamId/settings
  const { teamId } = useParams<{ teamId: string }>();

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // Add-member form state
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("developer");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Re-fetches the member list — called on mount and after any change
  async function loadMembers() {
    if (!teamId) return;
    setLoading(true);
    setPageError(null);
    try {
      const res = await getTeamMembers(teamId);
      setMembers(res.members);
    } catch (err) {
      setPageError(
        err instanceof Error ? err.message : "Failed to load members"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMembers();
  }, [teamId]);

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!teamId) return;
    setAddError(null);
    setAdding(true);

    try {
      await addMember(teamId, email, role);
      setEmail("");
      setRole("developer");
      await loadMembers(); // refresh so the new member appears in the list
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add member");
    } finally {
      setAdding(false);
    }
  }

  async function handleRoleChange(userId: string, newRole: Role) {
    if (!teamId) return;
    try {
      await updateMemberRole(teamId, userId, newRole);
      await loadMembers(); // refresh so the dropdown reflects the saved role
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update role");
    }
  }

  async function handleRemove(userId: string, name: string) {
    if (!teamId) return;
    // Simple confirm dialog — good enough for now, could be a nicer
    // modal later, but removing someone shouldn't happen by accident
    const confirmed = window.confirm(`Remove ${name} from this team?`);
    if (!confirmed) return;

    try {
      await removeMember(teamId, userId);
      await loadMembers(); // refresh so the removed member disappears
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove member");
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-10">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (pageError) {
    return <div className="p-6 text-error">{pageError}</div>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-4 text-lg font-medium">Team Settings</h1>

      {/* Add member form */}
      <form
        onSubmit={handleAddMember}
        className="card mb-6 flex-row items-end gap-3 bg-base-100 p-4 shadow"
      >
        <div className="flex-1">
          <label className="mb-1 block text-xs text-base-content/60">
            Email
          </label>
          <input
            type="email"
            placeholder="name@company.com"
            className="input input-bordered w-full"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-base-content/60">
            Role
          </label>
          <select
            className="select select-bordered"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            <option value="developer">developer</option>
            <option value="qa">qa</option>
            <option value="admin">admin</option>
          </select>
        </div>

        <button type="submit" className="btn btn-primary" disabled={adding}>
          {adding ? "Adding..." : "Add member"}
        </button>
      </form>

      {addError && <p className="mb-4 text-sm text-error">{addError}</p>}

      {/* Member list */}
      <div className="card bg-base-100 p-4 shadow">
        <h2 className="mb-3 text-sm font-medium text-base-content/70">
          Members ({members.length})
        </h2>

        <div className="flex flex-col divide-y divide-base-200">
          {members.map((m) => (
            <div
              key={m.membershipId}
              className="flex items-center justify-between py-3"
            >
              <div>
                <p className="text-sm font-medium">{m.name}</p>
                <p className="text-xs text-base-content/60">{m.email}</p>
              </div>

              <div className="flex items-center gap-2">
                {/* Role dropdown — changing it saves immediately */}
                <select
                  className="select select-bordered select-xs"
                  value={m.role}
                  onChange={(e) =>
                    handleRoleChange(m.userId, e.target.value as Role)
                  }
                >
                  <option value="developer">developer</option>
                  <option value="qa">qa</option>
                  <option value="admin">admin</option>
                </select>

                <button
                  className="btn btn-ghost btn-xs text-error"
                  onClick={() => handleRemove(m.userId, m.name)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}