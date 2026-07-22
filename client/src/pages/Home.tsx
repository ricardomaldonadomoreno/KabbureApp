import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (loading) return;

    if (isAuthenticated && user) {
      // Redirect based on role
      if (user.role === "admin") {
        setLocation("/admin/dashboard");
      } else if (user.role === "driver") {
        setLocation("/driver/dashboard");
      } else {
        setLocation("/user/map");
      }
    }
  }, [isAuthenticated, user, loading, setLocation]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="flex flex-col items-center justify-center min-h-screen px-4">
        <div className="text-center max-w-2xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Mobility Intelligence
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 mb-4">
            Real-time transportation platform with live tracking and intelligent routing
          </p>
          <p className="text-lg text-slate-400 mb-12">
            Connect drivers, track routes, and access mobility data in real-time
          </p>

          {isAuthenticated ? (
            <div className="flex flex-col gap-4">
              <p className="text-slate-300">
                Welcome, <span className="font-semibold">{user?.name || user?.email}</span>
              </p>
              <p className="text-sm text-slate-400">
                Role: <span className="font-semibold capitalize">{user?.role}</span>
              </p>
              <Button
                onClick={() => logout()}
                variant="outline"
                className="bg-slate-800 hover:bg-slate-700 border-slate-600"
              >
                Log Out
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => startLogin()}
              size="lg"
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold px-8 py-3 rounded-lg"
            >
              Get Started
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
