import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { ReactNode } from 'react';

interface ProtectedRouteProps {
  allowedRoles: Array<'admin' | 'supplier'>;
  children: ReactNode;
}

function getRedirectForRole(role: 'admin' | 'supplier'): string {
  return role === 'admin' ? '/admin' : '/dashboard';
}

export default function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { user } = useAuth();

  // Not authenticated → redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Authenticated but wrong role → redirect to their appropriate dashboard
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={getRedirectForRole(user.role)} replace />;
  }

  // Authenticated and correct role → render children
  return <>{children}</>;
}
