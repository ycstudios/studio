
"use client";

import { DeveloperCard } from "@/components/DeveloperCard";
import { useAuth } from "@/contexts/AuthContext";
import type { User as UserType } from "@/types";
import { Loader2, Users, Search } from "lucide-react";
import React, { useEffect, useState } from "react";

export default function DevelopersListPage() {
  const { allUsers, isLoading: authLoading } = useAuth();
  const [developers, setDevelopers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(authLoading);
    if (!authLoading && allUsers) {
      const fetchedDevelopers = allUsers
        .filter(u => u.role === 'developer')
        .sort((a, b) => a.name.localeCompare(b.name)); // Simple ranking: alphabetical by name
      setDevelopers(fetchedDevelopers);
    }
  }, [allUsers, authLoading]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground text-lg">Loading available developers...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <Users className="mr-3 h-8 w-8 text-primary" />
          Browse Developers
        </h1>
        <p className="text-muted-foreground">
          Discover skilled developers available on the CodeCrafter platform. (Sorted alphabetically by name)
        </p>
      </header>

      {developers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {developers.map(dev => (
            <DeveloperCard
              key={dev.id}
              name={dev.name}
              description={dev.bio || "Experienced developer."}
              skills={dev.skills || []}
              avatarUrl={dev.avatarUrl}
              // In a real app, dataAiHint could be more specific if developer profiles had distinct imagery
              dataAiHint="developer profile" 
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Search className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-2xl font-semibold mb-2">No Developers Found</h2>
          <p className="text-muted-foreground">
            There are currently no developers listed, or new developers are still being added. Please check back later.
          </p>
        </div>
      )}
    </div>
  );
}
