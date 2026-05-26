import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import { workspaceService } from '../../services/api/workspace.service';
import LoadingSpinner from '../../components/ui/LoadingSpinner';

export default function InviteAcceptPage(): React.ReactElement {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, isInitialized } = useAuthStore();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (isInitialized && !isAuthenticated) {
      navigate('/login', { state: { from: location.pathname }, replace: true });
    }
  }, [isInitialized, isAuthenticated, navigate, location.pathname]);

  useEffect(() => {
    if (!isInitialized || !isAuthenticated || !token) return;

    let mounted = true;

    const acceptInvite = async () => {
      try {
        const result = await workspaceService.acceptInvite(token);
        if (mounted) {
          setStatus('success');
          // Wait a moment so the user sees success, then navigate
          setTimeout(() => {
            navigate(`/w/${result.membership.workspaceId}`, { replace: true });
          }, 1500);
        }
      } catch (error: any) {
        if (mounted) {
          const errMsg = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to accept invitation.';
          
          if (error.response?.status === 403 && errMsg.includes('different email address')) {
            useAuthStore.getState().logout().then(() => {
              navigate('/login', { state: { from: location }, replace: true });
            });
            return;
          }

          setStatus('error');
          setErrorMessage(errMsg);
        }
      }
    };

    acceptInvite();

    return () => {
      mounted = false;
    };
  }, [isInitialized, isAuthenticated, token, navigate]);

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  // MUST BE PUBLIC ROUTE logic:
  // If user is not authenticated, we let the useEffect redirect them.
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm px-8 py-10 text-center">
        
        {status === 'loading' && (
          <div className="flex flex-col items-center">
            <LoadingSpinner size="lg" />
            <h2 className="mt-6 text-xl font-semibold text-gray-900 dark:text-white">
              Accepting Invitation...
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Please wait while we set up your workspace access.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-6 text-xl font-semibold text-gray-900 dark:text-white">
              Invitation Accepted!
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Redirecting you to the workspace dashboard...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="mt-6 text-xl font-semibold text-gray-900 dark:text-white">
              Invitation Failed
            </h2>
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {errorMessage}
            </p>
            <button
              onClick={() => navigate('/')}
              className="mt-8 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
