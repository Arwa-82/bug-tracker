import { useState } from "react";
import { NavLink, useParams } from "react-router-dom";
import { LayoutGrid, Smartphone, Menu, X } from "lucide-react";

interface Team {
  id: string;
  name: string;
}

interface SidebarProps {
  teams: Team[];
}

export default function Sidebar({ teams }: SidebarProps) {
  const { teamId } = useParams<{ teamId: string }>();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeTeam = teams.find((t) => t.id === teamId);

  const linkBase =
    "flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors";
  const linkInactive = "text-white/70 hover:bg-primary/30";
  const linkActive = "bg-primary text-primary-content";

  const sidebarContent = (
    <div className="flex h-full w-[180px] flex-col bg-base-300 p-3">
      <div className="mb-5 flex items-center gap-2 px-1">
        <span className="text-lg">🐞</span>
        <span className="text-sm font-medium text-white">BugBoard</span>
      </div>

      <nav className="flex flex-col gap-1">
        <NavLink
          to="/teams"
          className={({ isActive }) =>
            `${linkBase} ${isActive && !teamId ? linkActive : linkInactive}`
          }
        >
          <LayoutGrid size={14} />
          Teams
        </NavLink>

        {teams.map((team) => (
          <NavLink
            key={team.id}
            to={`/teams/${team.id}/board`}
            className={({ isActive }) =>
              `${linkBase} ${team.id === teamId ? linkActive : linkInactive}`
            }
          >
            <Smartphone size={14} />
            {team.name}
          </NavLink>
        ))}
      </nav>

      {activeTeam && (
        <div className="ml-2 mt-3 flex flex-col gap-1.5 border-l border-primary pl-3">
          <span className="text-[10px] uppercase tracking-wide text-white/50">
            {activeTeam.name}
          </span>
          <NavLink
            to={`/teams/${activeTeam.id}/board`}
            className={({ isActive }) =>
              `text-xs ${isActive ? "font-medium text-white" : "text-white/70 hover:text-white"}`
            }
          >
            Board
          </NavLink>
          <NavLink
            to={`/teams/${activeTeam.id}/dashboard`}
            className={({ isActive }) =>
              `text-xs ${isActive ? "font-medium text-white" : "text-white/70 hover:text-white"}`
            }
          >
            Dashboard
          </NavLink>
          <NavLink
            to={`/teams/${activeTeam.id}/settings`}
            className={({ isActive }) =>
              `text-xs ${isActive ? "font-medium text-white" : "text-white/70 hover:text-white"}`
            }
          >
            Settings
          </NavLink>
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="hidden md:block">{sidebarContent}</div>

      <div className="flex items-center justify-between bg-base-300 p-3 md:hidden">
        <div className="flex items-center gap-2">
          <span className="text-lg">🐞</span>
          <span className="text-sm font-medium text-white">BugBoard</span>
        </div>
        <button
          aria-label="Open menu"
          onClick={() => setMobileOpen(true)}
          className="text-white"
        >
          <Menu size={20} />
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="relative">
            {sidebarContent}
            <button
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
              className="absolute right-2 top-2 text-white"
            >
              <X size={18} />
            </button>
          </div>
          <div
            className="flex-1 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
        </div>
      )}
    </>
  );
}