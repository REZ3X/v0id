"use client";
import { useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { UserRole } from "@/models/User";

interface AuthGuardProps {
  children: ReactNode;
  requiredRole?: UserRole;
}

export default function AuthGuard({ children, requiredRole }: AuthGuardProps) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [hasRequiredRole, setHasRequiredRole] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const progressInterval = setInterval(() => {
          setLoadingProgress((prev) => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            return prev + Math.random() * 30;
          });
        }, 100);

        const response = await fetch("/api/auth/me");

        if (response.ok) {
          const data = await response.json();
          setAuthenticated(true);

          if (requiredRole) {
            const roleHierarchy: Record<UserRole, number> = {
              dev: 3,
              premium: 2,
              basic: 1,
            };

            const userRole = data.user.role as UserRole;

            const userRoleLevel = roleHierarchy[userRole];
            const requiredRoleLevel = roleHierarchy[requiredRole];

            const hasAccess = userRoleLevel >= requiredRoleLevel;
            setHasRequiredRole(hasAccess);

            if (!hasAccess) {
              router.replace("/");
            }
          } else {
            setHasRequiredRole(true);
          }

          setLoadingProgress(100);
        } else {
          router.replace("/login");
        }
      } catch {
        router.replace("/login");
      } finally {
        setTimeout(() => setLoading(false), 800);
      }
    };

    checkAuth();
  }, [router, requiredRole]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute bottom-1/4 left-1/2 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
        </div>

        <div className="relative z-10 flex flex-col items-center">
          <div className="mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-purple-500/25 animate-bounce">
              <svg
                className="w-12 h-12 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>

          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text mb-2 animate-pulse">
              V0ID
            </h1>
            <p className="text-purple-200 text-lg font-medium">
              {requiredRole === "dev"
                ? "Accessing Admin Panel..."
                : "Authenticating..."}
            </p>
          </div>

          <div className="w-80 max-w-sm">
            <div className="flex justify-between text-xs text-purple-300 mb-2">
              <span>Loading</span>
              <span>{Math.round(loadingProgress)}%</span>
            </div>
            <div className="w-full bg-slate-800/50 backdrop-blur-sm rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 rounded-full transition-all duration-300 ease-out relative"
                style={{ width: `${loadingProgress}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
              </div>
            </div>
          </div>

          <div className="flex space-x-2 mt-8">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce delay-75"></div>
            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-150"></div>
          </div>

          <div className="mt-6 text-purple-300 text-sm font-medium">
            <span className="inline-block animate-pulse">
              Securing your connection
            </span>
            <span className="inline-block animate-bounce delay-100">.</span>
            <span className="inline-block animate-bounce delay-200">.</span>
            <span className="inline-block animate-bounce delay-300">.</span>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="flex items-center space-x-2 text-purple-400/60 text-xs">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                clipRule="evenodd"
              />
            </svg>
            <span>Secured by V0ID</span>
          </div>
        </div>
      </div>
    );
  }

  return authenticated && hasRequiredRole ? <>{children}</> : null;
}
