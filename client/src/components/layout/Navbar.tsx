import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

// Top bar shown above the page content, next to the sidebar.
// Shows the logged-in user's name and a logout pill.
export default function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  function handleLogout() {
    logout(); // clears the token and local user state (from useAuth)
    navigate("/login");
  }

  return (
    <div className="flex items-center justify-end gap-3 border-b border-base-300 bg-base-100 px-6 py-3">
      {user && (
        <span className="text-sm text-base-content/70">
          Hi, <span className="font-medium text-base-content">{user.name}</span>
        </span>
      )}
      <button
        onClick={handleLogout}
        className="btn btn-ghost btn-sm gap-1 rounded-full"
      >
        Logout
      </button>
    </div>
  );
}