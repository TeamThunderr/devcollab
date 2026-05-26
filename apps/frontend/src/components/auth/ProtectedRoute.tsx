import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import LoadingSpinner from '../ui/LoadingSpinner';

export default function ProtectedRoute({ children }: { children: React.ReactElement }) {
  const { isAuthenticated, isInitialized } = useAuthStore();
  const location = useLocation();

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
