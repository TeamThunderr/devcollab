import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import useAuthStore from "../../stores/authStore";
import LoadingSpinner from "../../components/ui/LoadingSpinner";

export default function ResetPasswordPage(): React.ReactElement {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [success, setSuccess] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const { resetPassword, isLoading, error } = useAuthStore();

  useEffect(() => {
    if (!token) {
      setLocalError("Invalid or missing reset token.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLocalError(null);

    if (password !== confirmPassword) {
      setLocalError("Passwords do not match.");
      return;
    }

    if (!token) return;

    try {
      await resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 3000);
    } catch (err) {
      // Error handled by store
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0a0a] px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-800 p-8 text-center relative overflow-hidden">
        
        {/* Background glow */}
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-blue-500/10 blur-[40px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 rounded-full bg-purple-500/10 blur-[40px] pointer-events-none" />

        <div className="relative z-10">
          <svg className="w-12 h-12 text-blue-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Reset Password</h2>
          
          {success ? (
            <div className="mt-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl mb-4">
                <p className="text-sm text-green-700 dark:text-green-400">
                  Password has been reset successfully! Redirecting to login...
                </p>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Enter your new password below. Ensure it contains at least 8 characters, an uppercase letter, a lowercase letter, a number, and a special character.
              </p>
              
              {(error || localError) && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
                  {localError || error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 text-left">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading || !token}
                    className="w-full px-4 py-3 text-sm rounded-xl bg-gray-100/50 dark:bg-[#111] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all disabled:opacity-50"
                    placeholder="Enter new password"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading || !token}
                    className="w-full px-4 py-3 text-sm rounded-xl bg-gray-100/50 dark:bg-[#111] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all disabled:opacity-50"
                    placeholder="Confirm new password"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading || !token}
                  className="w-full flex justify-center py-3 px-4 mt-2 text-sm font-semibold rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-blue-500/30 hover:shadow-blue-500/50"
                >
                  {isLoading ? <LoadingSpinner size="sm" /> : "RESET PASSWORD"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
