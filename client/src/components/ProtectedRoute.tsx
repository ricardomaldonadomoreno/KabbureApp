import { useAuth } from "@/_core/hooks/useAuth";
import { Spinner } from "@/components/ui/spinner";
import { startLogin } from "@/const";
import { ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: "admin" | "driver" | "user";
  fallback?: ReactNode;
}

export function ProtectedRoute({
  children,
  requiredRole,
  fallback,
}: ProtectedRouteProps) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      fallback || (
        <div className="flex items-center justify-center min-h-screen">
          <Spinner />
        </div>
      )
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-2xl font-bold">Authentication Required</h1>
        <p className="text-muted-foreground">Please log in to access this page.</p>
        <button
          onClick={() => startLogin()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          Log In
        </button>
      </div>
    );
  }

  if (requiredRole && user?.role !== requiredRole) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">
          You do not have permission to access this page. Required role: {requiredRole}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
