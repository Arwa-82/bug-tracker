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