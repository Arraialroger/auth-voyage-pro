import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Skeleton } from '@/components/ui/skeleton';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: Array<'receptionist' | 'professional'>;
}

export const RoleProtectedRoute = ({ children, allowedRoles }: RoleProtectedRouteProps) => {
  const userProfile = useUserProfile();
  const navigate = useNavigate();

  useEffect(() => {
    if (!userProfile.loading && userProfile.type && !allowedRoles.includes(userProfile.type)) {
      navigate('/agenda', { replace: true });
    }
  }, [userProfile.type, userProfile.loading, allowedRoles, navigate]);

  if (userProfile.loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="container mx-auto max-w-6xl space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-32" />
          </div>
          <Skeleton className="h-64 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!userProfile.type || !allowedRoles.includes(userProfile.type)) {
    return null;
  }

  return <>{children}</>;
};
