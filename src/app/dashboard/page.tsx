
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { ProtectedPage } from "@/components/ProtectedPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { Briefcase, PlusCircle, Search, Eye, UserCheck, CheckCircle, Clock, Loader2, Info, AlertTriangle, FileText, ListChecks, FolderKanban } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { Project } from "@/types";
import { getProjectsByClientId, getAllProjects } from "@/lib/firebaseService";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow, format } from 'date-fns';
import { Timestamp } from "firebase/firestore";

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
          <p className="text-muted-foreground">Here&apos;s an overview of your activities on CodeCrafter.</p>
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

  const fetchClientProjects = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      setError("User not authenticated. Cannot fetch projects.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const clientProjects = await getProjectsByClientId(user.id);
      // Sort by creation date descending
      clientProjects.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : (a.createdAt as Timestamp)?.seconds || 0;
        const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : (b.createdAt as Timestamp)?.seconds || 0;
        return dateB - dateA;
      });
      setProjects(clientProjects);
    } catch (e) {
      console.error("Failed to fetch client projects:", e);
      const errorMsg = e instanceof Error ? e.message : "Could not retrieve your projects.";
      setError(errorMsg);
      toast({ title: "Error", description: errorMsg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, toast]);

  useEffect(() => {
    fetchClientProjects();
  }, [fetchClientProjects]);

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
      <Alert variant="destructive" className="my-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Loading Projects</AlertTitle>
        <AlertDescription>{error} Please try refreshing the page or contact support if the issue persists.</AlertDescription>
      </Alert>
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
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-start gap-3">
                    <FileText className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                    <CardTitle className="text-xl line-clamp-2">{project.name}</CardTitle>
                  </div>
                  <ProjectStatusBadge status={project.status} />
                </div>
                <CardDescription className="line-clamp-1 mt-1">
                  Skills: {project.requiredSkills?.join(", ") || "Not specified"}
                </CardDescription>
                 {project.createdAt && (
                  <p className="text-xs text-muted-foreground pt-1">
                    Posted {formatDistanceToNow(project.createdAt instanceof Date ? project.createdAt : new Date( (project.createdAt as Timestamp).seconds * 1000 ), { addSuffix: true })}
                  </p>
                )}
              </CardHeader>
              <CardContent className="flex-grow">
                  <p className="text-sm text-muted-foreground line-clamp-3">{project.description}</p>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/projects/${project.id}/matchmaking`}>
                    <Eye className="mr-2 h-4 w-4" /> View Details & Applications
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
  let dotColor = "bg-gray-500 dark:bg-gray-400";
  let icon = <Clock className="mr-1.5 h-3 w-3" />;
  let currentStatus = status || "Unknown";

  if (currentStatus === "In Progress") {
    bgColor = "bg-blue-500/20 text-blue-700 dark:text-blue-300 dark:bg-blue-700/30";
    dotColor = "bg-blue-500 dark:bg-blue-400";
  } else if (currentStatus === "Open") {
    bgColor = "bg-green-500/20 text-green-700 dark:text-green-300 dark:bg-green-700/30";
    dotColor = "bg-green-500 dark:bg-green-400";
    icon = <Eye className="mr-1.5 h-3 w-3" />;
  } else if (currentStatus === "Completed") {
    bgColor = "bg-purple-500/20 text-purple-700 dark:text-purple-300 dark:bg-purple-700/30";
    dotColor = "bg-purple-500 dark:bg-purple-400";
    icon = <CheckCircle className="mr-1.5 h-3 w-3" />;
  } else if (currentStatus === "Cancelled") {
    bgColor = "bg-red-500/20 text-red-700 dark:text-red-300 dark:bg-red-700/30";
    dotColor = "bg-red-500 dark:bg-red-400";
    icon = <Info className="mr-1.5 h-3 w-3" />;
  } else {
     bgColor = "bg-gray-500/20 text-gray-700 dark:text-gray-300 dark:bg-gray-700/30";
     dotColor = "bg-gray-500 dark:bg-gray-400";
     currentStatus = "Unknown";
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} whitespace-nowrap flex-shrink-0`}>
      <svg className={`-ml-0.5 mr-1.5 h-2 w-2 ${dotColor} hidden sm:block`} fill="currentColor" viewBox="0 0 8 8">
        <circle cx="4" cy="4" r="3" />
      </svg>
      {icon}
      {currentStatus}
    </span>
  );
}


function DeveloperDashboard() {
  const { user } = useAuth();
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [assignedProjects, setAssignedProjects] = useState<Project[]>([]);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllProjects = useCallback(async () => {
    if (!user || !user.id) return;
    setIsLoading(true);
    setError(null);
    try {
      const fetchedProjects = await getAllProjects();
      // Sort by creation date descending
      fetchedProjects.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : (a.createdAt as Timestamp)?.seconds || 0;
        const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : (b.createdAt as Timestamp)?.seconds || 0;
        return dateB - dateA;
      });
      setAllProjects(fetchedProjects);

      const devAssigned = fetchedProjects.filter(p => p.assignedDeveloperId === user.id);
      const devAvailable = fetchedProjects.filter(p => p.status === "Open" && p.assignedDeveloperId !== user.id);
      
      setAssignedProjects(devAssigned);
      setAvailableProjects(devAvailable);

    } catch (e) {
      console.error("Failed to fetch projects for developer dashboard:", e);
      const errorMsg = e instanceof Error ? e.message : "Could not retrieve projects.";
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAllProjects();
  }, [fetchAllProjects]);

  if (isLoading) {
    return (
      <section className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading projects...</p>
      </section>
    );
  }

  if (error) {
     return (
      <Alert variant="destructive" className="my-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Loading Projects</AlertTitle>
        <AlertDescription>{error} Please try refreshing the page or contact support if the issue persists.</AlertDescription>
      </Alert>
    );
  }

  return (
    <section className="space-y-10">
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <h2 className="text-2xl font-semibold flex items-center">
            <FolderKanban className="mr-3 h-7 w-7 text-primary" />
            My Assigned Projects ({assignedProjects.length})
          </h2>
          <Button asChild variant="outline">
            <Link href="/profile">
              <UserCheck className="mr-2 h-4 w-4" /> Update Your Profile
            </Link>
          </Button>
        </div>
        {assignedProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assignedProjects.map((project) => (
              <ProjectCard key={project.id} project={project} isAssignedToCurrentUser={true} />
            ))}
          </div>
        ) : (
          <Card className="text-center py-12 shadow-md">
            <CardHeader>
              <ListChecks className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <CardTitle>No Assigned Projects Yet</CardTitle>
              <CardDescription>Projects assigned to you will appear here. Keep an eye on available projects!</CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-6 flex items-center">
          <Search className="mr-3 h-7 w-7 text-accent" />
          Available Projects ({availableProjects.length})
        </h2>
        {availableProjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableProjects.map((project) => (
              <ProjectCard key={project.id} project={project} isAssignedToCurrentUser={false} />
            ))}
          </div>
        ) : (
          <Card className="text-center py-12 shadow-md">
            <CardHeader>
              <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <CardTitle>No Open Projects Yet</CardTitle>
              <CardDescription>Keep your profile updated. We&apos;ll notify you when suitable projects appear, or check back soon!</CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </section>
  );
}

interface ProjectCardProps {
  project: Project;
  isAssignedToCurrentUser?: boolean;
}

function ProjectCard({ project, isAssignedToCurrentUser = false }: ProjectCardProps) {
  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start gap-2">
          <div className="flex items-start gap-3">
              <FileText className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
              <CardTitle className="text-xl line-clamp-2">{project.name}</CardTitle>
          </div>
          <ProjectStatusBadge status={project.status} />
        </div>
        <CardDescription className="mt-1">
          Client Timezone: {project.timeZone || "Not specified"}
        </CardDescription>
          {project.createdAt && (
            <p className="text-xs text-muted-foreground pt-1">
                Posted {formatDistanceToNow(project.createdAt instanceof Date ? project.createdAt : new Date( (project.createdAt as Timestamp).seconds * 1000 ), { addSuffix: true })}
            </p>
          )}
      </CardHeader>
      <CardContent className="flex-grow">
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
        <Button variant={isAssignedToCurrentUser ? "default" : "outline"} className="w-full" asChild>
            <Link href={`/projects/${project.id}/matchmaking`}>
              <Eye className="mr-2 h-4 w-4" />
              {isAssignedToCurrentUser ? "View My Project" : "View Project Details"}
            </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

    