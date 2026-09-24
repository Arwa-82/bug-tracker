import { Routes, Route, Navigate } from "react-router-dom";
import Sidebar from "./components/layout/Sidebar";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import TeamsListPage from "./pages/TeamsListPage";
import TeamBoardPage from "./pages/TeamBoardPage";
import BugDetailPage from "./pages/BugDetailPage";
import { useEffect, useState } from "react";
import { getMyTeams } from "./api/teams";
import type { Team } from "./api/teams";

// Shared layout for any page that should show the sidebar.
// Fetches the user's teams once so Sidebar can list them.
function AppLayout({ children }: { children: React.ReactNode }) {
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    getMyTeams().then((res) => setTeams(res.teams));
  }, []);

  return (
    <div className="flex min-h-screen bg-base-200">
      <Sidebar teams={teams} />
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}

function App() {
  return (
    <Routes>
      {/* Redirect the bare root URL straight into the app */}
      <Route path="/" element={<Navigate to="/teams" replace />} />

      {/* Public routes — no ProtectedRoute wrapper, no sidebar */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected routes — require a valid session, wrapped in the sidebar layout */}
      <Route
        path="/teams"
        element={
          <ProtectedRoute>
            <AppLayout>
              <TeamsListPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/teams/:teamId/board"
        element={
          <ProtectedRoute>
            <AppLayout>
              <TeamBoardPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bugs/:bugId"
        element={
          <ProtectedRoute>
            <AppLayout>
              <BugDetailPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;