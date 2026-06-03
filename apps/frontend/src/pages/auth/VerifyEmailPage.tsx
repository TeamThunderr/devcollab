import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import useAuthStore from "../../stores/authStore";
import LoadingSpinner from "../../components/ui/LoadingSpinner";

export default function VerifyEmailPage(): React.ReactElement {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  
  const verifyEmail = useAuthStore((s) => s.verifyEmail);
  const resendVerification = useAuthStore((s) => s.resendVerification);
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resendStatus, setResendStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [resendMessage, setResendMessage] = useState('');
  
  const hasVerified = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage("No verification token provided.");
      return;
    }

    if (hasVerified.current) return;
    hasVerified.current = true;

    const performVerification = async () => {
      try {
        await verifyEmail(token);
        setStatus('success');
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(err.response?.data?.error || err.message || "Failed to verify email");
      }
    };

    performVerification();
  }, [token, verifyEmail]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail) return;
    
    setResendStatus('loading');
    try {
      await resendVerification(resendEmail);
      setResendStatus('success');
      setResendMessage('Verification email sent! Please check your inbox.');
    } catch (err: any) {
      setResendStatus('error');
      setResendMessage(err.response?.data?.error || err.message || 'Failed to resend email.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0a0a] px-4 relative overflow-hidden">
      {/* Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40rem] h-[40rem] bg-blue-500/10 dark:bg-purple-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-indigo-500/10 dark:bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-[450px] bg-white/70 dark:bg-gray-900/50 backdrop-blur-2xl rounded-3xl shadow-xl border border-gray-200/50 dark:border-gray-800/50 overflow-hidden flex flex-col p-8 z-10 text-center">
        
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">Email Verification</h1>
        </div>

        {status === 'loading' && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <LoadingSpinner size="lg" />
            <p className="text-gray-600 dark:text-gray-400">Verifying your email...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center justify-center py-4 space-y-4">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-2">
              <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Verified!</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Your email address has been successfully verified.</p>
            <button
              onClick={() => navigate('/login')}
              className="w-full flex justify-center py-3 px-4 text-sm font-semibold rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-md shadow-blue-500/30 hover:shadow-blue-500/50"
            >
              Go to Sign In
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center justify-center py-4 space-y-4 text-left">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-2 mx-auto">
              <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white text-center w-full">Verification Failed</h2>
            <p className="text-red-600 dark:text-red-400 text-center w-full text-sm mb-4">{errorMessage}</p>
            
            <div className="w-full mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Resend Verification Email</h3>
              <form onSubmit={handleResend} className="space-y-3">
                <input
                  type="email"
                  required
                  placeholder="Enter your email"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  disabled={resendStatus === 'loading'}
                  className="w-full px-4 py-2.5 text-sm rounded-xl bg-gray-100/50 dark:bg-[#111] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
                <button
                  type="submit"
                  disabled={resendStatus === 'loading'}
                  className="w-full flex justify-center py-2.5 px-4 text-sm font-semibold rounded-xl bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 transition-all disabled:opacity-50"
                >
                  {resendStatus === 'loading' ? <LoadingSpinner size="sm" /> : "Resend Email"}
                </button>
              </form>
              
              {resendStatus === 'success' && (
                <p className="text-green-600 dark:text-green-400 text-sm mt-3 text-center">{resendMessage}</p>
              )}
              {resendStatus === 'error' && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-3 text-center">{resendMessage}</p>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
