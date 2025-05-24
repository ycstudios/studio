
"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import { ProtectedPage } from "@/components/ProtectedPage";
import { DeveloperCard } from "@/components/DeveloperCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Info, AlertTriangle, ArrowLeft } from "lucide-react";
import { matchDevelopers, MatchDevelopersInput, MatchDevelopersOutput } from "@/ai/flows/match-developers";
import type { Project as ProjectType } from "@/types";
import { getProjectById } from "@/lib/firebaseService";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link"; // Import Link
import { format } from 'date-fns'; // For date formatting

export default function ProjectMatchmakingPage() {
  const params = useParams();
  const router = useRouter(); // For back button
  const projectId = params.projectId as string;
  const { toast } = useToast();
  const { user } = useAuth(); // Get current user
  
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [isMatching, setIsMatching] = useState(false);
  const [project, setProject] = useState<ProjectType | null>(null);
  const [matches, setMatches] = useState<MatchDevelopersOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTransitionPending, startTransition] = useTransition();


  useEffect(() => {
    if (projectId) {
      const fetchProjectData = async () => {
        setIsLoadingProject(true);
        setError(null);
        try {
          const fetchedProject = await getProjectById(projectId);
          if (fetchedProject) {
            setProject(fetchedProject);
            // Automatically trigger AI matchmaking if user is client and project is fetched
            if (user?.role === 'client') {
              handleRunMatchmaking(fetchedProject);
            }
          } else {
            setError(`Project with ID '${projectId}' not found.`);
            toast({ title: "Error", description: "Project not found.", variant: "destructive" });
          }
        } catch (e) {
          console.error("Failed to fetch project:", e);
          const errorMessage = (e instanceof Error) ? e.message : "An unexpected error occurred.";
          setError(`Failed to load project: ${errorMessage}`);
          toast({ title: "Error", description: `Could not load project: ${errorMessage}`, variant: "destructive" });
        } finally {
          setIsLoadingProject(false);
        }
      };
      fetchProjectData();
    }
  }, [projectId, toast, user?.role]); // Added user?.role to dependencies

  const handleRunMatchmaking = async (currentProject: ProjectType | null = project) => {
    if (!currentProject) {
      toast({ title: "Error", description: "Project details not available for matchmaking.", variant: "destructive" });
      return;
    }
    if (user?.role !== 'client') {
      toast({ title: "Info", description: "Matchmaking is typically run by clients.", variant: "default" });
      // Allow viewing, but don't run matchmaking for non-clients unless explicitly triggered
      // Or simply return if you only want clients to trigger it.
      // return; 
    }

    setIsMatching(true);
    setError(null);
    setMatches(null);

    const inputForAI: MatchDevelopersInput = {
      projectRequirements: currentProject.description,
      requiredSkills: currentProject.requiredSkills,
      availability: currentProject.availability,
      timeZone: currentProject.timeZone,
    };
    
    startTransition(async () => {
      try {
        const result = await matchDevelopers(inputForAI);
        setMatches(result);
        toast({
          title: "Matchmaking Complete!",
          description: "Potential developer matches have been found for your project.",
        });
      } catch (e) {
        console.error("AI Matchmaking error:", e);
        const errorMessage = (e instanceof Error) ? e.message : "An unexpected error occurred.";
        setError(`AI Matchmaking failed: ${errorMessage}`);
        toast({
          title: "Matchmaking Error",
          description: `AI could not find matches: ${errorMessage}`,
          variant: "destructive",
        });
      } finally {
        setIsMatching(false);
      }
    });
  };


  if (isLoadingProject) {
    return (
      <ProtectedPage>
        <div className="container mx-auto p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
          <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground text-lg">Loading project details...</p>
        </div>
      </ProtectedPage>
    );
  }

  if (error || !project) {
    return (
      <ProtectedPage>
        <div className="container mx-auto p-4 md:p-6 lg:p-8 text-center">
          <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-semibold mb-2">Project Not Found</h1>
          <p className="text-muted-foreground">{error || `We couldn't find the details for this project. It might have been removed or the ID is incorrect.`}</p>
           <Button onClick={() => router.back()} className="mt-6">
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
          </Button>
        </div>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage>
      <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8">
         <Button onClick={() => router.back()} variant="outline" className="mb-0 sm:mb-2">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Previous Page
        </Button>

        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <CardTitle className="text-2xl sm:text-3xl">{project.name}</CardTitle>
                <ProjectStatusBadge status={project.status} />
            </div>
            <CardDescription>Project ID: {project.id}</CardDescription>
             {project.createdAt && (
                <p className="text-xs text-muted-foreground">
                    Posted: {format(project.createdAt.seconds ? project.createdAt.toDate() : new Date(project.createdAt), "MMMM d, yyyy 'at' h:mm a")}
                </p>
            )}
          </CardHeader>
          <CardContent>
            <h3 className="font-semibold mb-1 text-lg">Project Description:</h3>
            <p className="text-muted-foreground mb-4 whitespace-pre-wrap">{project.description}</p>
            
            <h3 className="font-semibold mb-1 text-lg">Required Skills:</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {project.requiredSkills.length > 0 ? 
                project.requiredSkills.map(skill => <span key={skill} className="px-3 py-1 bg-secondary text-secondary-foreground text-sm rounded-full">{skill}</span>)
                : <span className="text-sm text-muted-foreground italic">No specific skills listed.</span>
            }
            </div>

            <h3 className="font-semibold mb-1 text-lg">Client Availability:</h3>
            <p className="text-muted-foreground mb-4">{project.availability}</p>

            <h3 className="font-semibold mb-1 text-lg">Client Timezone:</h3>
            <p className="text-muted-foreground mb-4">{project.timeZone}</p>

            {user?.role === 'client' && project.status === "Open" && (
                 <Button onClick={() => handleRunMatchmaking(project)} disabled={isMatching || isTransitionPending} className="mt-4">
                    {(isMatching || isTransitionPending) ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Search className="mr-2 h-4 w-4" />
                    )}
                    {(isMatching || isTransitionPending) ? "Finding Matches..." : "Run AI Matchmaking Again"}
                </Button>
            )}
          </CardContent>
        </Card>

        {(isMatching || isTransitionPending) && (
             <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-xl">Finding Developer Matches...</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center p-8">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">Our AI is searching for the best developers for your project.</p>
                </CardContent>
            </Card>
        )}

        {matches && !isMatching && !isTransitionPending && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">AI Developer Matches</CardTitle>
              <CardDescription>Here are the developers our AI believes are a good fit for your project based on the latest run.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2 text-lg">AI Reasoning:</h3>
                <p className="text-sm text-muted-foreground bg-muted p-4 rounded-md border whitespace-pre-wrap">{matches.reasoning}</p>
              </div>
              
              <h3 className="font-semibold text-lg">Matched Developer Profiles:</h3>
              {matches.developerMatches.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {matches.developerMatches.map((devProfileText, index) => (
                     <DeveloperCard 
                      key={index} 
                      name={`Potential Developer ${index + 1}`} // AI returns array of strings
                      description={devProfileText} 
                      skills={project.requiredSkills} // Base skills from project
                      dataAiHint="developer profile abstract"
                      // Placeholder: In a real app, you'd have structured developer objects from AI
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                    <Info className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No specific developer profiles were matched by the AI for this project at this time.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
        {error && !isMatching && !isLoadingProject && (
             <Card className="border-destructive shadow-lg">
                <CardHeader>
                    <CardTitle className="text-destructive text-xl">Matchmaking Error</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-destructive-foreground">{error}</p>
                </CardContent>
            </Card>
        )}
      </div>
    </ProtectedPage>
  );
}


// Re-using ProjectStatusBadge from dashboard, ensure it's robust
function ProjectStatusBadge({ status }: { status: ProjectType["status"] }) {
  let bgColor = "bg-muted text-muted-foreground";
  let dotColor = "bg-gray-500";
  let icon = <Clock className="mr-1.5 h-3 w-3" />;

  if (status === "In Progress") {
    bgColor = "bg-blue-500/20 text-blue-700 dark:bg-blue-700/30 dark:text-blue-300";
    dotColor = "bg-blue-500";
  } else if (status === "Open") {
    bgColor = "bg-green-500/20 text-green-700 dark:bg-green-700/30 dark:text-green-300";
    dotColor = "bg-green-500";
    icon = <Eye className="mr-1.5 h-3 w-3" />;
  } else if (status === "Completed") {
    bgColor = "bg-purple-500/20 text-purple-700 dark:bg-purple-700/30 dark:text-purple-300";
    dotColor = "bg-purple-500";
    icon = <CheckCircle className="mr-1.5 h-3 w-3" />;
  } else if (status === "Cancelled") {
    bgColor = "bg-red-500/20 text-red-700 dark:bg-red-700/30 dark:text-red-300";
    dotColor = "bg-red-500";
    icon = <Info className="mr-1.5 h-3 w-3" />;
  } else { // Default for any other status
    status = status || "Unknown";
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

// Helper for useRouter
import { useRouter } from "next/navigation";
