
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.tsx';
import type { UserRole } from '../types/api.ts';

interface ProtectedRouteProps {
  roles?: UserRole[];
}

export function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const { user, isReady } = useAuth();
  const location = useLocation();

  // Tunggu sampai pemeriksaan sesi selesai
  if (!isReady) {
    return (
      <div
        role="status"
        className="flex min-h-screen items-center justify-center"
      >
        Memeriksa sesi login...
      </div>
    );
  }

  // Jika belum login, arahkan ke halaman login
  if (!user) {
    const redirect = `${location.pathname}${location.search}`;

    return (
      <Navigate
        to={`/login?redirect=${encodeURIComponent(redirect)}`}
        replace
      />
    );
  }

  // Jika role tidak sesuai, arahkan ke Forbidden
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/forbidden" replace />;
  }

  // Jika semua pemeriksaan lolos, tampilkan halaman
  return <Outlet />;
}
