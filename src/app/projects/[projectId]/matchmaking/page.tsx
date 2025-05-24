
"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useParams, useRouter } from "next/navigation"; 
import { ProtectedPage } from "@/components/ProtectedPage";
import { DeveloperCard } from "@/components/DeveloperCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Info, AlertTriangle, ArrowLeft, Search, Eye, CheckCircle, Clock, UserCheck } from "lucide-react";
import { matchDevelopers, MatchDevelopersInput, MatchDevelopersOutput } from "@/ai/flows/match-developers";
import type { Project as ProjectType } from "@/types";
import { getProjectById } from "@/lib/firebaseService";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link"; 
import { format, formatDistanceToNow } from 'date-fns'; 

export default function ProjectMatchmakingPage() {
  const params = useParams();
  const router = useRouter(); 
  const projectId = params.projectId as string;
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth(); 
  
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [isMatching, setIsMatching] = useState(false);
  const [project, setProject] = useState<ProjectType | null>(null);
  const [matches, setMatches] = useState<MatchDevelopersOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isTransitionPending, startTransition] = useTransition();
  const [applied, setApplied] = useState(false); 


  useEffect(() => {
    if (projectId) {
      const fetchProjectData = async () => {
        setIsLoadingProject(true);
        setError(null);
        setAiError(null);
        try {
          const fetchedProject = await getProjectById(projectId);
          if (fetchedProject) {
            setProject(fetchedProject);
            if (user?.role === 'client' && user.id === fetchedProject.clientId && fetchedProject.status === "Open") {
              handleRunMatchmaking(fetchedProject, false); // false to not show initial toast
            }
          } else {
            setError(`Project with ID '${projectId}' not found.`);
          }
        } catch (e) {
          const errorMessage = (e instanceof Error) ? e.message : "An unexpected error occurred.";
          setError(`Failed to load project: ${errorMessage}`);
        } finally {
          setIsLoadingProject(false);
        }
      };
      fetchProjectData();
    } else {
        setError("No project ID provided in URL.");
        setIsLoadingProject(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, user?.role, user?.id]); 

  const handleRunMatchmaking = async (currentProject: ProjectType | null = project, showToast: boolean = true) => {
    if (!currentProject) {
      toast({ title: "Error", description: "Project details not available for matchmaking.", variant: "destructive" });
      return;
    }

    setIsMatching(true);
    setAiError(null); 
    if(showToast) setMatches(null); // Clear previous matches only if explicitly re-running

    const inputForAI: MatchDevelopersInput = {
      projectRequirements: currentProject.description,
      requiredSkills: currentProject.requiredSkills || [],
      availability: currentProject.availability || "Not specified",
      timeZone: currentProject.timeZone || "Not specified",
    };
    
    if (showToast) {
        toast({
            title: "AI Matchmaking In Progress...",
            description: "Our AI is searching for developer matches for your project.",
        });
    }

    startTransition(async () => {
      try {
        const result = await matchDevelopers(inputForAI);
        setMatches(result);
        if (showToast) {
            toast({
            title: "Matchmaking Complete!",
            description: "Potential developer matches have been found.",
            });
        }
      } catch (e) {
        const errorMessage = (e instanceof Error) ? e.message : "An unexpected error occurred.";
        setAiError(`AI Matchmaking failed: ${errorMessage}`); 
        if (showToast) {
            toast({
            title: "Matchmaking Error",
            description: `AI could not find matches: ${errorMessage}`,
            variant: "destructive",
            });
        }
      } finally {
        setIsMatching(false);
      }
    });
  };

  const handleApplyForProject = () => {
    setApplied(true);
    toast({
      title: "Application Submitted!",
      description: "Your interest in this project has been noted. The project owner will be informed.",
    });
  };


  if (isLoadingProject || authLoading) {
    return (
      <ProtectedPage>
        <div className="container mx-auto p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
          <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground text-lg">Loading project details...</p>
        </div>
      </ProtectedPage>
    );
  }

  if (error && !project) { 
    return (
      <ProtectedPage>
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
           <Alert variant="destructive" className="max-w-2xl mx-auto">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error Loading Project</AlertTitle>
            <AlertDescription>
              {error || `We couldn't find the details for this project.`}
            </AlertDescription>
          </Alert>
           <Button onClick={() => router.back()} variant="outline" className="mt-6 block mx-auto">
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
          </Button>
        </div>
      </ProtectedPage>
    );
  }

  if (!project) { 
     return (
      <ProtectedPage>
        <div className="container mx-auto p-4 md:p-6 lg:p-8 text-center">
          <Info className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-semibold mb-2">Project Not Found</h1>
          <p className="text-muted-foreground">{`We couldn't find the details for project ID '${projectId}'. It might have been removed or the ID is incorrect.`}</p>
           <Button onClick={() => router.back()} variant="outline" className="mt-6">
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
          </Button>
        </div>
      </ProtectedPage>
    );
  }

  const canApply = user?.role === 'developer' && project.status === "Open" && user.id !== project.clientId;
  const isClientOwner = user?.role === 'client' && user.id === project.clientId;


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
                    Posted: {format(project.createdAt instanceof Date ? project.createdAt : new Date((project.createdAt as any).seconds * 1000), "MMMM d, yyyy 'at' h:mm a")}
                </p>
            )}
          </CardHeader>
          <CardContent>
            <h3 className="font-semibold mb-1 text-lg">Project Description:</h3>
            <p className="text-muted-foreground mb-4 whitespace-pre-wrap">{project.description || <span className="italic">No description provided.</span>}</p>
            
            <h3 className="font-semibold mb-1 text-lg">Required Skills:</h3>
            <div className="flex flex-wrap gap-2 mb-4">
              {project.requiredSkills && project.requiredSkills.length > 0 ? 
                project.requiredSkills.map(skill => <span key={skill} className="px-3 py-1 bg-secondary text-secondary-foreground text-sm rounded-full">{skill}</span>)
                : <span className="text-sm text-muted-foreground italic">No specific skills listed.</span>
            }
            </div>

            <h3 className="font-semibold mb-1 text-lg">Client Availability:</h3>
            <p className="text-muted-foreground mb-4">{project.availability || <span className="italic">Not specified</span>}</p>

            <h3 className="font-semibold mb-1 text-lg">Client Timezone:</h3>
            <p className="text-muted-foreground mb-4">{project.timeZone || <span className="italic">Not specified</span>}</p>

            {isClientOwner && project.status === "Open" && (
                 <Button onClick={() => handleRunMatchmaking(project, true)} disabled={isMatching || isTransitionPending} className="mt-4">
                    {(isMatching || isTransitionPending) ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Search className="mr-2 h-4 w-4" />
                    )}
                    {(isMatching || isTransitionPending) ? "Finding Matches..." : "Run AI Matchmaking Again"}
                </Button>
            )}
            {canApply && (
              <Button onClick={handleApplyForProject} disabled={applied} className="mt-4 w-full sm:w-auto">
                {applied ? <CheckCircle className="mr-2 h-4 w-4" /> : <UserCheck className="mr-2 h-4 w-4" />}
                {applied ? "Application Submitted" : "Apply for Project"}
              </Button>
            )}
          </CardContent>
        </Card>

        {(isMatching || isTransitionPending) && (
             <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        Finding Developer Matches...
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center p-8">
                    <p className="text-muted-foreground">Our AI is searching for the best developers for your project. This may take a moment.</p>
                </CardContent>
            </Card>
        )}

        {aiError && !isMatching && !isLoadingProject && ( 
             <Alert variant="destructive" className="my-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>AI Matchmaking Error</AlertTitle>
                <AlertDescription>{aiError}</AlertDescription>
            </Alert>
        )}
        
        {matches && !isMatching && !isTransitionPending && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">AI Developer Suggestions</CardTitle>
              <CardDescription>Here are developer profiles our AI believes could be a good fit for your project.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2 text-lg">AI Reasoning:</h3>
                <p className="text-sm text-muted-foreground bg-muted p-4 rounded-md border whitespace-pre-wrap">{matches.reasoning || "No specific reasoning provided by AI."}</p>
              </div>
              
              <h3 className="font-semibold text-lg">Suggested Developer Profiles:</h3>
              {matches.developerMatches && matches.developerMatches.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {matches.developerMatches.map((devProfileText, index) => (
                     <DeveloperCard 
                      key={index} 
                      name={`Suggested Developer Profile ${index + 1}`} 
                      description={devProfileText} 
                      skills={project.requiredSkills || []} 
                      dataAiHint="developer profile abstract"
                      matchQuality="Good Fit" // This is a placeholder
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
      </div>
    </ProtectedPage>
  );
}


function ProjectStatusBadge({ status }: { status?: ProjectType["status"] }) {
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
