import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../api/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false); // shows the confirmation message after submit
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Enter your email.");
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(email);
      // Always show success, matching the backend's intentionally
      // generic response — never reveal whether the email exists
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-base-300">
      <div className="card w-96 bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Reset your password</h2>

          {submitted ? (
            // Confirmation state — shown after a successful submit,
            // replaces the form entirely
            <div className="flex flex-col gap-3">
              <p className="text-sm text-base-content/70">
                If an account exists for <strong>{email}</strong>, we've sent
                a link to reset your password. Check your inbox.
              </p>
              <Link to="/login" className="link link-primary text-sm">
                Back to login
              </Link>
            </div>
          ) : (
            <>
              <p className="mb-2 text-sm text-base-content/70">
                Enter your email and we'll send you a link to reset your
                password.
              </p>

              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3">
                <label className="form-control">
                  <span className="label-text mb-1">Email</span>
                  <input
                    type="email"
                    className={`input input-bordered w-full ${error ? "input-error" : ""}`}
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>

                {error && <p className="text-sm text-error">{error}</p>}

                <button
                  type="submit"
                  className="btn btn-primary mt-2"
                  disabled={loading}
                >
                  {loading ? "Sending..." : "Send reset link"}
                </button>
              </form>

              <p className="mt-2 text-center text-sm">
                <Link to="/login" className="link link-primary">
                  Back to login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}