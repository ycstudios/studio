"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";
import { UserRole } from "@/config/site";
import { Skeleton } from "@/components/ui/skeleton"; // For loading state

interface ProtectedPageProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedPage({ children, allowedRoles }: ProtectedPageProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login?redirect=" + window.location.pathname);
    } else if (!isLoading && user && allowedRoles && !allowedRoles.includes(user.role)) {
      // If user is logged in but does not have the required role, redirect to dashboard or an unauthorized page
      router.replace("/dashboard?error=unauthorized_role");
    }
  }, [user, isLoading, router, allowedRoles]);

  if (isLoading || !user || (allowedRoles && user && !allowedRoles.includes(user.role))) {
    // Show a full-page loading skeleton or a more specific loading component
    return (
      <div className="container mx-auto p-4 md:p-8 min-h-[calc(100vh-4rem)] flex flex-col">
        <div className="space-y-4">
          <Skeleton className="h-10 w-1/3" />
          <Skeleton className="h-6 w-1/2" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {[1,2,3].map(i => <Skeleton key={i} className="h-40 rounded-lg" />)}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
