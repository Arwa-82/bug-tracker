import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { register } from "../api/auth";

export default function RegisterPage() {
  const navigate = useNavigate();

  // Form field state — one useState per input, kept simple for now.
  // We'll swap this for react-hook-form later once forms get more complex.
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Holds a validation/server error message to show under the form
  const [error, setError] = useState<string | null>(null);

  // Disables the button and shows "Creating account..." while the request is in flight
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); // stop the browser's default full-page form submit
    setError(null);
    setLoading(true);

    try {
      // Call the backend's /auth/register endpoint
      const { token } = await register(name, email, password);

      // Save the JWT so future requests are authenticated
      localStorage.setItem("token", token);

      // Registration also logs the user in (backend returns a token),
      // so send them straight to the teams page — no separate login step needed
      navigate("/teams");
    } catch (err) {
      // err.message comes from apiFetch's error handling (e.g. "Email already in use")
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base-300">
      <div className="card w-96 bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Create an account</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label className="form-control">
              <span className="label-text mb-1">Name</span>
              <input
                type="text"
                className="input input-bordered w-full"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>

            <label className="form-control">
              <span className="label-text mb-1">Email</span>
              <input
                type="email"
                className="input input-bordered w-full"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <label className="form-control">
              <span className="label-text mb-1">Password</span>
              <input
                type="password"
                className="input input-bordered w-full"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6} // matches the backend's Zod schema (registerSchema)
              />
            </label>

            {/* Only rendered when there's an error — stays hidden otherwise */}
            {error && <p className="text-sm text-error">{error}</p>}

            <button
              type="submit"
              className="btn btn-primary mt-2"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          {/* Link back to login for people who already have an account */}
          <p className="mt-2 text-center text-sm">
            Already have an account?{" "}
            <Link to="/login" className="link link-primary">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}