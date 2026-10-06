import { apiFetch } from "./client";

interface AuthResponse {
  user: { id: string; name: string; email: string };
  token: string;
}

export function login(email: string, password: string) {
  return apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    skipAuth: true,
  });
}

export function register(name: string, email: string, password: string) {
  return apiFetch<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
    skipAuth: true,
  });
}

export function getMe() {
  return apiFetch<{ user: { id: string; name: string; email: string } }>(
    "/auth/me"
  );
}
// Requests a password reset email. Always resolves successfully
// regardless of whether the email exists — the backend intentionally
// doesn't reveal that, to prevent email enumeration.
export function forgotPassword(email: string) {
  return apiFetch<{ message: string }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
    skipAuth: true,
  });
}

// Submits the token from the emailed link plus a new password
export function resetPassword(token: string, password: string) {
  return apiFetch<{ message: string }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
    skipAuth: true,
  });
}