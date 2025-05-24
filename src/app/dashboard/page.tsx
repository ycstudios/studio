
"use client";

import React, { useEffect, useState } from "react";
import { ProtectedPage } from "@/components/ProtectedPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Briefcase, PlusCircle, Search, Eye, UserCheck, CheckCircle, Clock, Loader2, Info } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { Project } from "@/types";
import { getProjectsByClientId } from "@/lib/firebaseService";
import { useToast } from "@/hooks/use-toast";

// Mock data for developer dashboard - replace with actual data fetching
const mockDeveloperProjects = [
  { id: "4", clientName: "Tech Solutions Inc.", projectName: "Inventory Management System", skills: ["React", "Node.js", "MongoDB"], dataAiHint: "data charts" },
  { id: "5", clientName: "Creative Agency", projectName: "Portfolio Website Redesign", skills: ["Next.js", "TailwindCSS", "Figma"], dataAiHint: "web design" },
];


export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <ProtectedPage>
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Welcome to your Dashboard, {user?.name}!</h1>
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

  useEffect(() => {
    if (user?.id) {
      const fetchProjects = async () => {
        setIsLoading(true);
        try {
          const clientProjects = await getProjectsByClientId(user.id);
          setProjects(clientProjects);
        } catch (error) {
          console.error("Failed to fetch client projects:", error);
          toast({
            title: "Error Fetching Projects",
            description: "Could not retrieve your projects from the database.",
            variant: "destructive",
          });
        } finally {
          setIsLoading(false);
        }
      };
      fetchProjects();
    } else {
      setIsLoading(false); // Not logged in or no user ID
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

  return (
    <section>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-semibold">Your Projects</h2>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/projects/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Submit New Project
          </Link>
        </Button>
      </div>
      {projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <Card key={project.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{project.name}</CardTitle>
                  <ProjectStatusBadge status={project.status} />
                </div>
                <CardDescription>
                  Skills: {project.requiredSkills.join(", ") || "Not specified"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                 <Image 
                    src={`https://placehold.co/600x300.png`}
                    alt={project.name}
                    width={600}
                    height={300}
                    data-ai-hint="project abstract" // Generic hint for projects
                    className="rounded-md object-cover aspect-video w-full h-auto"
                  />
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{project.description}</p>
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
            <CardDescription>Start by submitting your first project and let us find the perfect developer for you.</CardDescription>
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

function ProjectStatusBadge({ status }: { status: Project["status"] }) {
  let bgColor = "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
  let dotColor = "bg-gray-500";
  let icon = <Clock className="mr-1.5 h-3 w-3" />;

  if (status === "In Progress") {
    bgColor = "bg-blue-100 text-blue-800 dark:bg-blue-700/30 dark:text-blue-300";
    dotColor = "bg-blue-500";
    icon = <Clock className="mr-1.5 h-3 w-3" />;
  } else if (status === "Open") {
    bgColor = "bg-green-100 text-green-800 dark:bg-green-700/30 dark:text-green-300";
    dotColor = "bg-green-500";
    icon = <Eye className="mr-1.5 h-3 w-3" />; // Or an open eye icon
  } else if (status === "Completed") {
    bgColor = "bg-purple-100 text-purple-800 dark:bg-purple-700/30 dark:text-purple-300";
    dotColor = "bg-purple-500";
    icon = <CheckCircle className="mr-1.5 h-3 w-3" />;
  } else if (status === "Cancelled") {
    bgColor = "bg-red-100 text-red-800 dark:bg-red-700/30 dark:text-red-300";
    dotColor = "bg-red-500";
    icon = <Info className="mr-1.5 h-3 w-3" />; // Or XCircle
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} whitespace-nowrap`}>
      <svg className={`-ml-0.5 mr-1.5 h-2 w-2 ${dotColor} hidden sm:block`} fill="currentColor" viewBox="0 0 8 8">
        <circle cx="4" cy="4" r="3" />
      </svg>
      {icon}
      {status}
    </span>
  );
}


function DeveloperDashboard() {
  return (
    <section>
      <h2 className="text-2xl font-semibold mb-6">Matched Projects</h2>
      {mockDeveloperProjects.length > 0 ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockDeveloperProjects.map((project) => (
          <Card key={project.id} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="text-xl">{project.projectName}</CardTitle>
              <CardDescription>From: {project.clientName}</CardDescription>
            </CardHeader>
            <CardContent>
               <Image 
                  src={`https://placehold.co/600x300.png`}
                  alt={project.projectName}
                  width={600}
                  height={300}
                  data-ai-hint={project.dataAiHint}
                  className="rounded-md object-cover aspect-video mb-4 w-full h-auto"
                />
              <p className="text-sm font-medium mb-1">Required Skills:</p>
              <div className="flex flex-wrap gap-2">
                {project.skills.map(skill => (
                  <span key={skill} className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded-md">{skill}</span>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="default" className="w-full">
                <UserCheck className="mr-2 h-4 w-4" /> View Project & Apply
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      ) : (
      <Card className="text-center py-12 shadow-md">
        <CardHeader>
          <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <CardTitle>No Matched Projects Yet</CardTitle>
          <CardDescription>Keep your profile updated. We&apos;ll notify you when suitable projects appear.</CardDescription>
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
