
"use client";

import React, { useEffect, useState, useTransition } from "react";
import { ProtectedPage } from "@/components/ProtectedPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Briefcase, PlusCircle, Search, Eye, UserCheck, CheckCircle, Clock, Loader2, Info, AlertTriangle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { Project } from "@/types";
import { getProjectsByClientId, getAllProjects } from "@/lib/firebaseService";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from 'date-fns';

export default function DashboardPage() {
  const { user, isLoading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <ProtectedPage>
        <div className="container mx-auto p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
          <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage>
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Welcome to your Dashboard, {user?.name || "User"}!</h1>
          <p className="text-muted-foreground">Here&apos;s an overview of your activities on CodeCrafter (data from Firestore).</p>
        </header>

        {user?.role === "client" && <ClientDashboard />}
        {user?.role === "developer" && <DeveloperDashboard />}
      </div>
    </ProtectedPage>
  );
}

function ClientDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      const fetchProjects = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const clientProjects = await getProjectsByClientId(user.id);
          setProjects(clientProjects);
        } catch (e) {
          console.error("Failed to fetch client projects:", e);
          const errorMsg = e instanceof Error ? e.message : "Could not retrieve your projects.";
          setError(errorMsg);
          toast({
            title: "Error Fetching Projects",
            description: errorMsg,
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      };
      fetchProjects();
    } else {
      setIsLoading(false); 
      setError("User not authenticated to fetch projects.");
    }
  }, [user?.id, toast]);

  if (isLoading) {
    return (
      <section className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading your projects...</p>
      </section>
    );
  }

  if (error) {
    return (
      <Card className="text-center py-12 shadow-md border-destructive">
        <CardHeader>
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <CardTitle className="text-destructive">Failed to Load Projects</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <section>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-semibold">Your Projects ({projects.length})</h2>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/projects/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Submit New Project
          </Link>
        </Button>
      </div>
      {projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl line-clamp-1">{project.name}</CardTitle>
                  <ProjectStatusBadge status={project.status} />
                </div>
                <CardDescription className="line-clamp-1">
                  Skills: {project.requiredSkills?.join(", ") || "Not specified"}
                </CardDescription>
                 {project.createdAt && (
                  <p className="text-xs text-muted-foreground">
                    Posted {formatDistanceToNow(project.createdAt instanceof Date ? project.createdAt : new Date(), { addSuffix: true })}
                  </p>
                )}
              </CardHeader>
              <CardContent className="flex-grow">
                 <Image 
                    src={`https://placehold.co/600x300.png`}
                    alt={project.name}
                    width={600}
                    height={300}
                    data-ai-hint="project abstract"
                    className="rounded-md object-cover aspect-video w-full h-auto mb-3"
                  />
                  <p className="text-sm text-muted-foreground line-clamp-3">{project.description}</p>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/projects/${project.id}/matchmaking`}>
                    <Eye className="mr-2 h-4 w-4" /> View Details & Matches
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-12 shadow-md">
          <CardHeader>
             <Briefcase className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <CardTitle>No Projects Yet</CardTitle>
            <CardDescription>Start by submitting your first project and let CodeCrafter find the perfect developer for you.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="lg">
              <Link href="/projects/new">
                <PlusCircle className="mr-2 h-4 w-4" /> Submit Your First Project
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </section>
  );
}

function ProjectStatusBadge({ status }: { status?: Project["status"] }) {
  let bgColor = "bg-muted text-muted-foreground";
  let dotColor = "bg-gray-500";
  let icon = <Clock className="mr-1.5 h-3 w-3" />;
  let currentStatus = status || "Unknown";

  if (currentStatus === "In Progress") {
    bgColor = "bg-blue-500/20 text-blue-700 dark:text-blue-300";
    dotColor = "bg-blue-500";
  } else if (currentStatus === "Open") {
    bgColor = "bg-green-500/20 text-green-700 dark:text-green-300";
    dotColor = "bg-green-500";
    icon = <Eye className="mr-1.5 h-3 w-3" />;
  } else if (currentStatus === "Completed") {
    bgColor = "bg-purple-500/20 text-purple-700 dark:text-purple-300";
    dotColor = "bg-purple-500";
    icon = <CheckCircle className="mr-1.5 h-3 w-3" />;
  } else if (currentStatus === "Cancelled") {
    bgColor = "bg-red-500/20 text-red-700 dark:text-red-300";
    dotColor = "bg-red-500";
    icon = <Info className="mr-1.5 h-3 w-3" />;
  }


  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} whitespace-nowrap`}>
      <svg className={`-ml-0.5 mr-1.5 h-2 w-2 ${dotColor} hidden sm:block`} fill="currentColor" viewBox="0 0 8 8">
        <circle cx="4" cy="4" r="3" />
      </svg>
      {icon}
      {currentStatus}
    </span>
  );
}


function DeveloperDashboard() {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOpenProjects = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const allProjects = await getAllProjects();
        setProjects(allProjects.filter(p => p.status === "Open"));
      } catch (e) {
        console.error("Failed to fetch open projects:", e);
        const errorMsg = e instanceof Error ? e.message : "Could not retrieve open projects.";
        setError(errorMsg);
        toast({
          title: "Error Fetching Projects",
          description: errorMsg,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchOpenProjects();
  }, [toast]);

  if (isLoading) {
    return (
      <section className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading available projects...</p>
      </section>
    );
  }

  if (error) {
    return (
      <Card className="text-center py-12 shadow-md border-destructive">
        <CardHeader>
          <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <CardTitle className="text-destructive">Failed to Load Projects</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <section>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-semibold">Available Projects ({projects.length})</h2>
         <Button asChild variant="outline">
            <Link href="/profile">
              <UserCheck className="mr-2 h-4 w-4" /> Update Your Profile
            </Link>
          </Button>
      </div>
      {projects.length > 0 ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <Card key={project.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl line-clamp-1">{project.name}</CardTitle>
                <ProjectStatusBadge status={project.status} />
              </div>
              <CardDescription>
                Client Timezone: {project.timeZone || "Not specified"}
              </CardDescription>
               {project.createdAt && (
                  <p className="text-xs text-muted-foreground">
                    Posted {formatDistanceToNow(project.createdAt instanceof Date ? project.createdAt : new Date(), { addSuffix: true })}
                  </p>
                )}
            </CardHeader>
            <CardContent className="flex-grow">
               <Image 
                  src={`https://placehold.co/600x300.png`}
                  alt={project.name}
                  width={600}
                  height={300}
                  data-ai-hint="project tech"
                  className="rounded-md object-cover aspect-video mb-4 w-full h-auto"
                />
              <p className="text-sm text-muted-foreground mb-2 line-clamp-3">{project.description}</p>
              <p className="text-sm font-medium mb-1">Required Skills:</p>
              <div className="flex flex-wrap gap-2">
                {project.requiredSkills?.map(skill => (
                  <span key={skill} className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded-md">{skill}</span>
                ))}
                {(!project.requiredSkills || project.requiredSkills.length === 0) && <span className="text-xs text-muted-foreground italic">No specific skills listed.</span>}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="default" className="w-full" asChild>
                 <Link href={`/projects/${project.id}/matchmaking`}>
                    <Eye className="mr-2 h-4 w-4" /> View Project Details 
                 </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      ) : (
      <Card className="text-center py-12 shadow-md">
        <CardHeader>
          <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <CardTitle>No Open Projects Yet</CardTitle>
          <CardDescription>Keep your profile updated. We&apos;ll notify you when suitable projects appear, or check back soon!</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/profile">
              Update Your Profile
            </Link>
          </Button>
        </CardContent>
      </Card>
      )}
    </section>
  );
}
