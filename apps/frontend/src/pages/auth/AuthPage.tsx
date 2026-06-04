import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import useAuthStore from "../../stores/authStore";
import { toast } from "../../stores/toastStore";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { workspaceService } from "../../services/api/workspace.service";

export default function AuthPage(): React.ReactElement {
  const navigate = useNavigate();
  const location = useLocation();
  const isRegisterRoute = location.pathname === "/register";

  const [isSignUp, setIsSignUp] = useState(isRegisterRoute);
  const [isRegistrationSuccess, setIsRegistrationSuccess] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  
  const fromState = location.state?.from;
  const from = typeof fromState === 'string' ? fromState : (fromState?.pathname || "/");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlAccessToken = params.get("accessToken");
    const urlRefreshToken = params.get("refreshToken");
    
    if (urlAccessToken && urlRefreshToken) {
      localStorage.setItem("refreshToken", urlRefreshToken);
      useAuthStore.getState().setAuthToken(urlAccessToken);
      
      // Clean up the URL
      window.history.replaceState({}, document.title, location.pathname);
      
      // Fetch user data and redirect
      useAuthStore.getState().fetchCurrentUser().then(() => {
        navigate(from, { replace: true });
      });
    } else {
      setIsSignUp(location.pathname === "/register");
    }
  }, [location.pathname, location.search, navigate, from]);

  const { login, register, forgotPassword, isLoading } = useAuthStore();

  const apiBaseUrl = import.meta.env.VITE_API_URL || "https://devcollab-backend-15q8.onrender.com";
  const handleGoogleLogin = () => {
    window.location.href = `${apiBaseUrl}/api/auth/google/login`;
  };
  const handleGithubLogin = () => {
    window.location.href = `${apiBaseUrl}/api/auth/github/login`;
  };

  // Form states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [githubLink, setGithubLink] = useState("");

  const handleToggle = (toSignUp: boolean) => {
    setIsSignUp(toSignUp);
    // optionally update URL without full remount/re-render glitch
    window.history.pushState(null, "", toSignUp ? "/register" : "/login");
  };

  async function handleSignIn(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      await login(email, password);
      await handleInviteToken();
      navigate(from, { replace: true });
    } catch (err: any) {
      const errData = err.response?.data?.error;
      const errMsg = Array.isArray(errData) ? errData[0].message : (typeof errData === 'string' ? errData : err.message || "Failed to login");
      toast.error("Login Failed", errMsg);
    }
  }

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      await register(email, password, name || undefined, githubLink || undefined);
      setIsRegistrationSuccess(true);
    } catch (err: any) {
      const errData = err.response?.data?.error;
      const errMsg = Array.isArray(errData) ? errData[0].message : (typeof errData === 'string' ? errData : err.message || "Registration failed");
      toast.error("Registration Failed", errMsg);
    }
  }

  async function handleForgotPasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    try {
      await forgotPassword(email);
      setForgotPasswordSuccess(true);
    } catch (err: any) {
      const errData = err.response?.data?.error;
      const errMsg = Array.isArray(errData) ? errData[0].message : (typeof errData === 'string' ? errData : err.message || "Failed to request password reset");
      toast.error("Error", errMsg);
    }
  }

  async function handleInviteToken() {
    const inviteToken = localStorage.getItem("inviteToken");
    if (inviteToken) {
      try {
        const result = await workspaceService.acceptInvite(inviteToken);
        localStorage.removeItem("inviteToken");
        navigate(`/w/${result.membership.workspaceId}`, { replace: true });
        throw new Error("Redirected"); // Stop execution
      } catch (inviteError: any) {
        if (inviteError.message !== "Redirected") {
          console.error("Failed to accept invite after auth:", inviteError);
          localStorage.removeItem("inviteToken");
        } else {
          throw inviteError;
        }
      }
    }
  }

  const socialButtons = (
    <div className="flex space-x-4 justify-center my-4">
      <button type="button" onClick={handleGoogleLogin} className="w-10 h-10 rounded-full border border-gray-300 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
      </button>
      <button type="button" onClick={handleGithubLogin} className="w-10 h-10 rounded-full border border-gray-300 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
        </svg>
      </button>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0a0a] px-4 relative overflow-hidden">
      {/* Developer Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-blue-500/10 dark:bg-purple-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-indigo-500/10 dark:bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-[850px] min-h-[550px] bg-white/70 dark:bg-gray-900/50 backdrop-blur-2xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-gray-200/50 dark:border-gray-800/50 overflow-hidden flex z-10">

        {/* Sign Up Form Container */}
        <div
          className={`absolute top-0 left-0 h-full w-1/2 p-10 flex flex-col justify-center transition-all duration-700 ease-in-out ${isSignUp
              ? "translate-x-[100%] opacity-100 z-20"
              : "translate-x-[0%] opacity-0 z-10 pointer-events-none"
            }`}
        >
          <div className="text-center mb-6">
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-2">Create Account</h1>
            {socialButtons}
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Register with E-mail</span>
          </div>

          {isRegistrationSuccess ? (
            <div className="text-center mt-6 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <svg className="w-12 h-12 text-blue-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Check your email</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                We've sent a verification link to <span className="font-semibold text-blue-600 dark:text-blue-400">{email}</span>. Please verify your email to log in.
              </p>
              <button 
                onClick={() => handleToggle(false)}
                className="mt-6 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Go to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleSignUp} className="space-y-4">
              <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-3 text-sm rounded-xl bg-gray-100/50 dark:bg-[#111] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all disabled:opacity-50"
              />
              <input
                type="email"
                required
                placeholder="Enter E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-3 text-sm rounded-xl bg-gray-100/50 dark:bg-[#111] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all disabled:opacity-50"
              />
              <input
                type="password"
                required
                minLength={6}
                placeholder="Enter Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-3 text-sm rounded-xl bg-gray-100/50 dark:bg-[#111] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all disabled:opacity-50"
              />
              <input
                type="url"
                placeholder="GitHub Profile Link (Optional)"
                value={githubLink}
                onChange={(e) => setGithubLink(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-3 text-sm rounded-xl bg-gray-100/50 dark:bg-[#111] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 mt-2 text-sm font-semibold rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-blue-500/30 hover:shadow-blue-500/50"
              >
                {isLoading ? <LoadingSpinner size="sm" /> : "SIGN UP"}
              </button>
            </form>
          )}
        </div>

        {/* Sign In Form Container */}
        <div
          className={`absolute top-0 left-0 h-full w-1/2 p-10 flex flex-col justify-center transition-all duration-700 ease-in-out ${isSignUp
              ? "translate-x-[100%] opacity-0 z-10 pointer-events-none"
              : "translate-x-[0%] opacity-100 z-20"
            }`}
        >
          <div className="text-center mb-6">
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-2">Sign In</h1>
            {socialButtons}
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">Sign in With Email & Password</span>
          </div>

          {isForgotPassword ? (
            forgotPasswordSuccess ? (
              <div className="text-center mt-2 p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                <svg className="w-12 h-12 text-blue-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Check your email</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  If an account exists with <span className="font-semibold text-blue-600 dark:text-blue-400">{email}</span>, a password reset link has been sent.
                </p>
                <button 
                  onClick={() => { setIsForgotPassword(false); setForgotPasswordSuccess(false); }}
                  className="mt-6 text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
                <div className="mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
                    Enter your email address and we'll send you a link to reset your password.
                  </p>
                </div>
                <input
                  type="email"
                  required
                  placeholder="Enter E-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-4 py-3 text-sm rounded-xl bg-gray-100/50 dark:bg-[#111] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-3 px-4 text-sm font-semibold rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-blue-500/30 hover:shadow-blue-500/50"
                >
                  {isLoading ? <LoadingSpinner size="sm" /> : "SEND RESET LINK"}
                </button>
                <div className="text-center pt-2 pb-1">
                  <button 
                    type="button" 
                    onClick={() => setIsForgotPassword(false)} 
                    className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    Back to Sign In
                  </button>
                </div>
              </form>
            )
          ) : (
            <form onSubmit={handleSignIn} className="space-y-4">
              <input
                type="email"
                required
                placeholder="Enter E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-3 text-sm rounded-xl bg-gray-100/50 dark:bg-[#111] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all disabled:opacity-50"
              />
              <input
                type="password"
                required
                placeholder="Enter Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full px-4 py-3 text-sm rounded-xl bg-gray-100/50 dark:bg-[#111] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all disabled:opacity-50"
              />

              <div className="text-center pt-2 pb-1">
                <button 
                  type="button" 
                  onClick={() => setIsForgotPassword(true)} 
                  className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  Forget Password?
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 text-sm font-semibold rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-md shadow-blue-500/30 hover:shadow-blue-500/50"
              >
                {isLoading ? <LoadingSpinner size="sm" /> : "SIGN IN"}
              </button>
            </form>
          )}
        </div>

        {/* Overlay Container */}
        <div
          className={`absolute top-0 left-1/2 w-1/2 h-full overflow-hidden transition-transform duration-700 ease-in-out z-50 ${isSignUp ? "-translate-x-full" : "translate-x-0"
            }`}
        >
          {/* Overlay Background */}
          <div
            className={`bg-gradient-to-br from-[#2563eb] via-[#6366f1] to-[#a855f7] text-white relative -left-full h-full w-[200%] transform transition-transform duration-700 ease-in-out shadow-[inset_0_0_80px_rgba(0,0,0,0.2)] ${isSignUp ? "translate-x-1/2" : "translate-x-0"
              }`}
          >
            {/* Left Panel of Overlay */}
            <div
              className={`absolute top-0 w-1/2 h-full flex flex-col items-center justify-center px-10 text-center transition-transform duration-700 ease-in-out ${isSignUp ? "translate-x-0" : "-translate-x-[20%]"
                }`}
            >
              <h2 className="text-4xl font-extrabold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-br from-white to-white/70">Welcome To DevCollab</h2>
              <p className="mb-8 text-blue-100/90 font-medium tracking-wide">Sign in With Email & Password</p>
              <button
                onClick={() => handleToggle(false)}
                className="border border-white/40 backdrop-blur-sm rounded-full px-12 py-3 text-sm font-semibold hover:bg-white hover:text-blue-600 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.3)]"
              >
                SIGN IN
              </button>
            </div>

            {/* Right Panel of Overlay */}
            <div
              className={`absolute top-0 right-0 w-1/2 h-full flex flex-col items-center justify-center px-10 text-center transition-transform duration-700 ease-in-out ${isSignUp ? "translate-x-[20%]" : "translate-x-0"
                }`}
            >
              <h2 className="text-4xl font-extrabold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-br from-white to-white/70">DevCollab</h2>
              <p className="mb-8 text-blue-100/90 font-medium tracking-wide">Sign up now and enjoy our site</p>
              <button
                onClick={() => handleToggle(true)}
                className="border border-white/40 backdrop-blur-sm rounded-full px-12 py-3 text-sm font-semibold hover:bg-white hover:text-blue-600 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.3)]"
              >
                SIGN UP
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
