import React, { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import useAuthStore from "../../stores/authStore";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { workspaceService } from "../../services/api/workspace.service";

export default function RegisterPage(): React.ReactElement {
  const navigate = useNavigate();
  const location = useLocation();
  const fromState = location.state?.from;
  const from = typeof fromState === 'string' ? fromState : (fromState?.pathname || "/");
  const { register, isLoading, error } = useAuthStore();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      await register(email, password, name || undefined);
      
      const inviteToken = localStorage.getItem("inviteToken");
      if (inviteToken) {
        try {
          const result = await workspaceService.acceptInvite(inviteToken);
          localStorage.removeItem("inviteToken");
          navigate(`/w/${result.membership.workspaceId}`, { replace: true });
          return;
        } catch (inviteError) {
          console.error("Failed to accept invite after register:", inviteError);
          localStorage.removeItem("inviteToken");
        }
      }

      navigate(from, { replace: true });
    } catch (err) {
      // Error handled by store
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">DevCollab</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Create a new account
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm px-8 py-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Register
          </h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full Name (Optional)
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 text-sm rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@devcollab.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="w-full px-3 py-2 text-sm rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="new-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                minLength={6}
                className="w-full px-3 py-2 text-sm rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2.5 px-4 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? <LoadingSpinner size="sm" /> : "Sign Up"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">
              Log in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
