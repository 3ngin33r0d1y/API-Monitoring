import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { post } from "@/lib/api";
import { saveSession } from "@/lib/auth";

export default function Login() {
  const nav = useNavigate();
  const [username, setUsername] = useState("admin"); // default for speed
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data } = await post<{ username: string; authorities: any }>("/auth/login", { username, password });
      saveSession({ username: data.username, authorities: data.authorities });
      nav("/");
    } catch (err: any) {
      setError(err?.response?.status === 401 ? "Invalid credentials" : err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <form onSubmit={onSubmit} className="w-full max-w-sm rounded-lg bg-white p-6 shadow">
          <h1 className="mb-4 text-xl font-semibold">Sign in</h1>

          <label className="block text-sm text-gray-700">Username</label>
          <input
              className="mt-1 mb-3 w-full rounded border px-3 py-2"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
          />

          <label className="block text-sm text-gray-700">Password</label>
          <input
              type="password"
              className="mt-1 mb-3 w-full rounded border px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
          />

          {error && <div className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">{error}</div>}

          <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-black px-3 py-2 text-white hover:bg-black/90 disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <p className="mt-3 text-xs text-gray-500">
            Allowed credentials: admin/admin123, dashboard/password, user/user123, demo/demo, manager/manager2024, developer/dev@2024
          </p>
        </form>
      </div>
  );
}
