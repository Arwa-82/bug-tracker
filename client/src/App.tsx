import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Sidebar from "./components/layout/Sidebar";
import Navbar from "./components/layout/Navbar";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import TeamsListPage from "./pages/TeamsListPage";
import TeamBoardPage from "./pages/TeamBoardPage";
import BugDetailPage from "./pages/BugDetailPage";
import TeamSettingsPage from "./pages/TeamSettingsPage";
import TeamDashboardPage from "./pages/TeamDashboardPage";
import { getMyTeams } from "./api/teams";
import type { Team } from "./api/teams";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

// Shared layout for any page that should show the sidebar + navbar.
function AppLayout({ children }: { children: React.ReactNode }) {
  const [teams, setTeams] = useState<Team[]>([]);

  useEffect(() => {
    getMyTeams().then((res) => setTeams(res.teams));
  }, []);

  return (
    <div className="flex min-h-screen bg-base-200">
      <Sidebar teams={teams} />
      <div className="flex flex-1 flex-col">
        <Navbar />
        <div className="flex-1 p-6">{children}</div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/teams" replace />} />

      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

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
        path="/teams/:teamId/dashboard"
        element={
          <ProtectedRoute>
            <AppLayout>
              <TeamDashboardPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/teams/:teamId/settings"
        element={
          <ProtectedRoute>
            <AppLayout>
              <TeamSettingsPage />
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