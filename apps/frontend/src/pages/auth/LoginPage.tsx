// TEMP — replace with real implementation (real auth API, validation, error handling)

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../../stores/authStore";
import { connectSocket } from "../../lib/socket";

const TEST_WORKSPACE_ID = "workspace-test-123";

export default function LoginPage(): React.ReactElement {
  const navigate = useNavigate();
  const { setAuth, user, isAuthenticated } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function performLogin(loginEmail: string): void {
    const fakeUser = {
      userId: `user-${Date.now()}`,
      name: "Test User",
      email: loginEmail,
      avatar: null,
    };
    const fakeToken = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLXRlc3QtMSIsImVtYWlsIjoidGVzdEBkZXZjb2xsYWIuY29tIiwibmFtZSI6IlRlc3QgVXNlciIsImlhdCI6MTc3OTE3MjQ1MSwiZXhwIjoxNzc5Nzc3MjUxfQ.TQULz-C19Tad3kwdYzsQ-l_h9ye8oc2LOuJqPohMMbk`;
    setAuth(fakeUser, fakeToken);
    connectSocket(fakeToken, TEST_WORKSPACE_ID);
    navigate("/");
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    performLogin(email || "test@devcollab.com");
  }

  function handleQuickLogin(): void {
    performLogin("test@devcollab.com");
  }

  return (
    <div className="min-h-screen flex items-center justify-center
                    bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            DevCollab
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Real-time developer collaboration
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-900
                        border border-gray-200 dark:border-gray-800
                        rounded-xl shadow-sm px-8 py-8">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-6">
            Sign in to your account
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@devcollab.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg
                           bg-gray-50 dark:bg-gray-800
                           border border-gray-300 dark:border-gray-700
                           text-gray-900 dark:text-white
                           placeholder-gray-400 dark:placeholder-gray-500
                           focus:outline-none focus:ring-2 focus:ring-blue-500
                           transition-colors duration-150"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg
                           bg-gray-50 dark:bg-gray-800
                           border border-gray-300 dark:border-gray-700
                           text-gray-900 dark:text-white
                           placeholder-gray-400 dark:placeholder-gray-500
                           focus:outline-none focus:ring-2 focus:ring-blue-500
                           transition-colors duration-150"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 text-sm font-medium rounded-lg
                         bg-blue-600 hover:bg-blue-700 active:bg-blue-800
                         text-white transition-colors duration-150
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Login
            </button>
          </form>

          {/* Quick Login */}
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={handleQuickLogin}
              className="w-full py-2 px-4 text-sm font-medium rounded-lg
                         bg-gray-100 dark:bg-gray-800
                         hover:bg-gray-200 dark:hover:bg-gray-700
                         text-gray-700 dark:text-gray-300
                         transition-colors duration-150
                         focus:outline-none focus:ring-2 focus:ring-gray-400"
            >
              ⚡ Quick Login (test@devcollab.com)
            </button>
          </div>
        </div>

        {/* Auth state debug */}
        {isAuthenticated && user && (
          <p className="mt-4 text-center text-xs text-green-600 dark:text-green-400">
            ✓ Logged in as: <span className="font-medium">{user.name}</span>
          </p>
        )}
      </div>
    </div>
  );
}
