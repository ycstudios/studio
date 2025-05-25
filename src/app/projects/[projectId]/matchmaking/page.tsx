
"use client";

import React, { useEffect, useState, useTransition, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProtectedPage } from "@/components/ProtectedPage";
import { DeveloperCard } from "@/components/DeveloperCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Info, AlertTriangle, ArrowLeft, Search, Eye, CheckCircle, Clock, UserCheck, Send, UsersRound, ThumbsUp, ThumbsDown, FileSignature } from "lucide-react";
import { matchDevelopers, type MatchDevelopersInput, type MatchDevelopersOutput } from "@/ai/flows/match-developers";
import type { Project as ProjectType, User as UserType, ProjectApplication, ApplicationStatus } from "@/types";
import {
  getProjectById,
  addProjectApplication,
  getApplicationsByDeveloperForProject,
  getApplicationsByProjectId,
  updateProjectApplicationStatus,
  assignDeveloperToProject,
  rejectOtherPendingApplications,
} from "@/lib/firebaseService";
import { getApplicationRejectedEmailToDeveloper, getNewProjectApplicationEmailToClient, sendEmail, getApplicationAcceptedEmailToDeveloper } from "@/lib/emailService";
import { useAuth } from "@/contexts/AuthContext";
import { format, formatDistanceToNow } from 'date-fns';
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";


export default function ProjectMatchmakingPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();

  const [project, setProject] = useState<ProjectType | null>(null);
  const [matches, setMatches] = useState<MatchDevelopersOutput | null>(null);
  const [projectApplications, setProjectApplications] = useState<ProjectApplication[]>([]);

  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [isMatching, setIsMatching] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isLoadingApplications, setIsLoadingApplications] = useState(false);
  const [isProcessingApplication, setIsProcessingApplication] = useState<string | null>(null); // applicationId

  const [error, setError] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [applicationsError, setApplicationsError] = useState<string | null>(null);

  const [isTransitionPending, startTransition] = useTransition();
  const [hasApplied, setHasApplied] = useState(false);

  const [initialMatchmakingDoneForCurrentProject, setInitialMatchmakingDoneForCurrentProject] = useState(false);

  const handleRunMatchmaking = useCallback(async (currentProject: ProjectType, showToast: boolean = true) => {
    if (!currentProject) {
      if (showToast) toast({ title: "Error", description: "Project details not available for matchmaking.", variant: "destructive" });
      return;
    }

    setIsMatching(true);
    setAiError(null);
    if (showToast) setMatches(null); // Clear previous matches if re-running manually

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
    console.log(`[MatchmakingPage] handleRunMatchmaking: Starting AI match for project ID ${currentProject.id}`);

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
        const errorMessage = (e instanceof Error) ? e.message : "An unexpected error occurred during AI matchmaking.";
        setAiError(`AI Matchmaking failed: ${errorMessage}`);
        console.error(`[MatchmakingPage] handleRunMatchmaking: AI error for project ID ${currentProject.id}`, e);
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
  }, [toast, startTransition]);

  const fetchProjectData = useCallback(async () => {
    if (!projectId) {
      setError("No project ID provided in URL.");
      setIsLoadingProject(false);
      return;
    }
    console.log(`[MatchmakingPage] fetchProjectData: Fetching project for ID ${projectId}`);
    setIsLoadingProject(true);
    setError(null);
    setProject(null);
    setMatches(null);
    setAiError(null);
    setHasApplied(false);
    setProjectApplications([]);
    setApplicationsError(null);
    setInitialMatchmakingDoneForCurrentProject(false); // Reset for new project ID

    try {
      const fetchedProject = await getProjectById(projectId);
      if (fetchedProject) {
        console.log(`[MatchmakingPage] fetchProjectData: Successfully fetched project ${fetchedProject.name}`);
        setProject(fetchedProject);
      } else {
        console.warn(`[MatchmakingPage] fetchProjectData: Project with ID '${projectId}' not found.`);
        setError(`Project with ID '${projectId}' not found or data is invalid.`);
      }
    } catch (e) {
      const errorMessage = (e instanceof Error) ? e.message : "An unexpected error occurred while fetching project details.";
      console.error(`[MatchmakingPage] fetchProjectData: Error fetching project ${projectId}:`, e);
      setError(`Failed to load project: ${errorMessage}`);
    } finally {
      setIsLoadingProject(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);


  const manageApplications = useCallback(async () => {
    if (!user || !project?.id) return;

    if (user.role === 'developer') {
      console.log(`[MatchmakingPage] manageApplications: Developer ${user.id} viewing project ${project.id}. Checking applications.`);
      setIsLoadingApplications(true);
      setHasApplied(false);
      try {
        const existingApplications = await getApplicationsByDeveloperForProject(user.id, project.id);
        if (existingApplications.length > 0) {
          console.log(`[MatchmakingPage] manageApplications: Developer ${user.id} has already applied to project ${project.id}.`);
          setHasApplied(true);
        }
      } catch (error) {
        console.error("[MatchmakingPage] manageApplications: Error checking existing developer applications:", error);
      } finally {
        setIsLoadingApplications(false);
      }
    } else if (user.role === 'admin' || user.id === project.clientId) {
      console.log(`[MatchmakingPage] manageApplications: Client/Admin ${user.id} viewing project ${project.id}. Fetching applications.`);
      setIsLoadingApplications(true);
      setApplicationsError(null);
      try {
        const apps = await getApplicationsByProjectId(project.id);
        console.log(`[MatchmakingPage] manageApplications: Fetched ${apps.length} applications for project ${project.id}.`);
        setProjectApplications(apps);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : "Could not fetch applications for this project.";
        setApplicationsError(errorMsg);
        console.error("[MatchmakingPage] manageApplications: Error fetching project applications:", error);
      } finally {
        setIsLoadingApplications(false);
      }
    }
  }, [user, project]);

  useEffect(() => {
    if (project && user) {
      manageApplications();
    }
  }, [project, user, manageApplications]);


  useEffect(() => {
    if (!isLoadingProject && !authLoading && project && user && !initialMatchmakingDoneForCurrentProject) {
      // Run initial AI matchmaking for client, developer (if project is open), or admin
      if (project.status === "Open" && (user.id === project.clientId || user.role === 'developer' || user.role === 'admin')) {
        console.log(`[MatchmakingPage] Initial AI matchmaking trigger for project ${project.id}, user ${user.id}`);
        handleRunMatchmaking(project, false); // showToast set to false for initial auto-run
      }
      setInitialMatchmakingDoneForCurrentProject(true);
    }
  }, [project, user, isLoadingProject, authLoading, initialMatchmakingDoneForCurrentProject, handleRunMatchmaking]);


  const handleApplyForProject = async () => {
    if (!user || user.role !== 'developer' || !project || !project.name) {
      toast({ title: "Error", description: "Cannot apply: User not a developer or project details missing.", variant: "destructive" });
      return;
    }
    if (!user.email || !user.name){
        toast({ title: "Error", description: "Your user profile is incomplete (missing name or email). Please update your profile.", variant: "destructive" });
        return;
    }
    setIsApplying(true);
    try {
      const applicationData = {
        projectId: project.id,
        projectName: project.name,
        developerId: user.id,
        developerName: user.name,
        developerEmail: user.email,
        messageToClient: `I am interested in discussing project "${project.name}" further. My skills align well with the requirements.`
      };
      await addProjectApplication(applicationData);
      setHasApplied(true);
      toast({
        title: "Application Submitted!",
        description: "Your interest in this project has been noted. The project owner will be informed.",
      });
    } catch (error) {
      console.error("[MatchmakingPage] handleApplyForProject: Error submitting application:", error);
      const errorMsg = error instanceof Error ? error.message : "Could not submit application.";
      toast({ title: "Application Error", description: errorMsg, variant: "destructive" });
    } finally {
      setIsApplying(false);
    }
  };

  const handleUpdateApplication = async (application: ProjectApplication, newStatus: ApplicationStatus) => {
    if (!user || !project || (user.id !== project.clientId && user.role !== 'admin')) {
      toast({ title: "Unauthorized", description: "Only the project owner or an admin can manage applications.", variant: "destructive" });
      return;
    }
     if (!project.name) { 
        toast({ title: "Project Error", description: "Project name is missing, cannot proceed.", variant: "destructive" });
        return;
    }

    const appData = projectApplications.find(app => app.id === application.id);
    if (!appData || !appData.developerEmail || !appData.developerName || !appData.projectName || !appData.projectId) {
        toast({ title: "Application Error", description: "Developer details missing in application. Cannot proceed.", variant: "destructive" });
        return;
    }

    setIsProcessingApplication(application.id);
    try {
      // The main application status is updated first.
      await updateProjectApplicationStatus(application.id, newStatus, user.id, user.name || "Admin/Client");

      if (newStatus === 'accepted') {
        // Assign developer to project also handles email to accepted developer
        await assignDeveloperToProject(project.id, application.id, appData.developerId, appData.developerName, appData.developerEmail, user.id, user.name || "Admin/Client");
        // Reject others also handles their email notifications
        await rejectOtherPendingApplications(project.id, application.id, user.id, user.name || "Admin/Client");
      } else if (newStatus === 'rejected') {
        // This email is for the specific developer being manually rejected.
        // The developerNotifiedOfStatus update for this specific app rejection is handled within updateProjectApplicationStatus.
        const emailHtml = await getApplicationRejectedEmailToDeveloper(application.developerName, project.name, project.id);
        await sendEmail(application.developerEmail, `Update on Your Application for "${project.name}"`, emailHtml);
        if(db) { // Ensure db is defined
          // This line is technically redundant if updateProjectApplicationStatus handles developerNotifiedOfStatus for direct rejections,
          // but explicit here ensures it after direct email.
          // The service function should ideally handle its own notifications status.
        }
      }

      // Refresh project data (to reflect status change like "In Progress")
      const updatedProject = await getProjectById(project.id);
      if (updatedProject) setProject(updatedProject);

      // Re-fetch all applications for this project to update the list UI
      const apps = await getApplicationsByProjectId(project.id);
      setProjectApplications(apps);

      toast({ title: "Application Updated", description: `${appData.developerName}'s application has been ${newStatus}.` });

    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Could not update application status.";
      toast({ title: "Error", description: errorMsg, variant: "destructive" });
      console.error(`[MatchmakingPage] handleUpdateApplication: Error updating application ${application.id} for project ${project.id}:`, e);
    } finally {
      setIsProcessingApplication(null);
    }
  };


  if (isLoadingProject || authLoading) {
    return (
      <ProtectedPage>
        <div className="container mx-auto p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
          <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground text-lg">
            {authLoading ? "Authenticating user..." : "Loading project details..."}
          </p>
        </div>
      </ProtectedPage>
    );
  }

  if (error) {
    return (
      <ProtectedPage>
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
          <Alert variant="destructive" className="max-w-2xl mx-auto">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error Loading Project</AlertTitle>
            <AlertDescription>
              {error} Please try refreshing or contact support if the issue persists.
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
          <h1 className="text-2xl font-semibold mb-2">Project Data Not Available</h1>
          <p className="text-muted-foreground">
            We couldn't load the details for this project. It might have been removed or the ID is incorrect.
          </p>
          <Button onClick={() => router.back()} variant="outline" className="mt-6">
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
          </Button>
        </div>
      </ProtectedPage>
    );
  }

  const isClientOwner = user?.id === project.clientId;
  const canDeveloperApply = user?.role === 'developer' && project.status === "Open" && user.id !== project.clientId && !hasApplied;
  const isProjectAssignedToCurrentUser = user?.role === 'developer' && project.status === "In Progress" && project.assignedDeveloperId === user.id;
  const canManageApplications = (isClientOwner || user?.role === 'admin') && project.status === "Open";


  const isLoadingAIMatches = isMatching || isTransitionPending;

  const safeCreateDateLocal = (timestamp: any): Date | undefined => {
    if (!timestamp) return undefined;
    if (timestamp instanceof Date) return timestamp;
    if (timestamp instanceof Timestamp) return timestamp.toDate();
    if (timestamp && typeof timestamp.seconds === 'number' && typeof timestamp.nanoseconds === 'number') {
      try {
        const date = new Timestamp(timestamp.seconds, timestamp.nanoseconds).toDate();
        if (!isNaN(date.getTime())) return date;
      } catch (e) { console.warn("Failed to convert object to Timestamp, then to Date:", e); }
    }
    if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) return date;
    }
    return undefined;
  };

  const projectCreatedAtDate = project.createdAt instanceof Date ? project.createdAt : safeCreateDateLocal(project.createdAt);


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
            {projectCreatedAtDate && (
              <p className="text-xs text-muted-foreground">
                Posted: {format(projectCreatedAtDate, "MMMM d, yyyy 'at' h:mm a")}
                ({formatDistanceToNow(projectCreatedAtDate, { addSuffix: true })})
              </p>
            )}
            {project.status === "In Progress" && project.assignedDeveloperName && (
              <Alert variant="default" className="mt-4 bg-blue-500/10 border-blue-500/30">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-700 dark:text-blue-300">Project In Progress</AlertTitle>
                <AlertDescription className="text-blue-600 dark:text-blue-400">
                  This project is currently assigned to: <strong>{project.assignedDeveloperName}</strong>.
                  {project.assignedDeveloperId && <Link href={`/developers/${project.assignedDeveloperId}`} className="ml-2 text-xs underline hover:text-blue-500">(View Profile)</Link>}
                </AlertDescription>
              </Alert>
            )}
             {project.status === "Completed" && project.assignedDeveloperName && (
               <Alert variant="default" className="mt-4 bg-purple-500/10 border-purple-500/30">
                <CheckCircle className="h-4 w-4 text-purple-600" />
                <AlertTitle className="text-purple-700 dark:text-purple-300">Project Completed</AlertTitle>
                <AlertDescription className="text-purple-600 dark:text-purple-400">
                  This project was completed by: <strong>{project.assignedDeveloperName}</strong>.
                  {project.assignedDeveloperId && <Link href={`/developers/${project.assignedDeveloperId}`} className="ml-2 text-xs underline hover:text-purple-500">(View Profile)</Link>}
                </AlertDescription>
              </Alert>
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

            {(isClientOwner || user?.role === 'admin') && project.status === "Open" && (
              <Button onClick={() => handleRunMatchmaking(project, true)} disabled={isLoadingAIMatches} className="mt-4">
                {isLoadingAIMatches ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="mr-2 h-4 w-4" />
                )}
                {isLoadingAIMatches ? "Finding Matches..." : "Run AI Matchmaking Again"}
              </Button>
            )}
            {canDeveloperApply && (
              <Button onClick={handleApplyForProject} disabled={isApplying || isLoadingApplications} className="mt-4 w-full sm:w-auto">
                {isApplying || isLoadingApplications ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSignature className="mr-2 h-4 w-4" />}
                {isApplying ? "Submitting..." : (isLoadingApplications ? "Checking..." : "Apply for Project")}
              </Button>
            )}
            {user?.role === 'developer' && hasApplied && project.status === "Open" && (
              <Button disabled className="mt-4 w-full sm:w-auto cursor-not-allowed">
                <CheckCircle className="mr-2 h-4 w-4" />
                Application Submitted
              </Button>
            )}
            {isProjectAssignedToCurrentUser && (
              <Alert variant="default" className="mt-4 bg-green-500/10 border-green-500/30">
                <ThumbsUp className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-700 dark:text-green-300">You're On This Project!</AlertTitle>
                <AlertDescription className="text-green-600 dark:text-green-400">
                  Congratulations! You have been assigned to this project.
                </AlertDescription>
              </Alert>
            )}
             {project.status !== "Open" && user?.role === 'developer' && !isProjectAssignedToCurrentUser && (
                 <Alert variant="default" className="mt-4">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Project Not Open</AlertTitle>
                    <AlertDescription>
                    This project is no longer accepting new applications.
                    </AlertDescription>
                </Alert>
            )}
          </CardContent>
        </Card>

        {project.status === "Open" && !isProjectAssignedToCurrentUser && (isClientOwner || user?.role === 'admin') && (
          <>
            {isLoadingAIMatches && !aiError && (
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

            {aiError && !isLoadingAIMatches && (
              <Alert variant="destructive" className="my-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>AI Matchmaking Error</AlertTitle>
                <AlertDescription>{aiError}</AlertDescription>
              </Alert>
            )}

            {matches && !isLoadingAIMatches && !aiError && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl">AI Developer Suggestions</CardTitle>
                  <CardDescription>Here are developer profiles our AI believes could be a good fit for your project. These are AI-generated suggestions based on your criteria.</CardDescription>
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
                          name={`Suggested Developer Profile ${index + 1} (AI Suggestion)`}
                          description={devProfileText}
                          skills={project.requiredSkills || []}
                          dataAiHint="developer profile abstract"
                          matchQuality="Good Fit"
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
          </>
        )}

        {canManageApplications && (
          <Card className="shadow-lg mt-8" id="applications">
            <CardHeader>
              <CardTitle className="text-xl flex items-center">
                <UsersRound className="mr-2 h-5 w-5 text-primary" />
                Project Applications ({isLoadingApplications ? <Loader2 className="h-4 w-4 animate-spin" /> : projectApplications.filter(app => app.status === 'pending').length} pending)
              </CardTitle>
              <CardDescription>Review developers who have applied for this project.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingApplications ? <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> :
                applicationsError ? <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{applicationsError}</AlertDescription></Alert> :
                  projectApplications.length === 0 ? <p className="text-muted-foreground text-center py-4">No applications received yet.</p> :
                    (
                      <div className="space-y-4">
                        {projectApplications.filter(app => app.status === 'pending').map(app => (
                          <Card key={app.id}>
                            <CardHeader>
                              <div className="flex justify-between items-start">
                                <div>
                                  <CardTitle className="text-lg">{app.developerName}</CardTitle>
                                  <CardDescription>Applied: {app.appliedAt ? formatDistanceToNow(safeCreateDateLocal(app.appliedAt) || new Date(0), { addSuffix: true }) : 'Unknown'}</CardDescription>
                                </div>
                                <ApplicationStatusBadge status={app.status} />
                              </div>
                            </CardHeader>
                            <CardContent>
                              {app.messageToClient && <p className="text-sm text-muted-foreground mb-3 p-3 bg-muted rounded-md whitespace-pre-wrap"><em>"{app.messageToClient}"</em></p>}
                            </CardContent>
                            <CardFooter className="gap-2 flex-wrap">
                              <Button variant="outline" size="sm" asChild>
                                <Link href={`/developers/${app.developerId}`} target="_blank">
                                  <UserCheck className="mr-2 h-4 w-4" /> View Profile
                                </Link>
                              </Button>
                              {app.status === 'pending' && project.status === "Open" && (
                                <>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleUpdateApplication(app, 'rejected')}
                                    disabled={isProcessingApplication === app.id}
                                  >
                                    {isProcessingApplication === app.id ? <Loader2 className="animate-spin mr-2" /> : <ThumbsDown className="mr-2 h-4 w-4" />}
                                    Reject
                                  </Button>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleUpdateApplication(app, 'accepted')}
                                    disabled={isProcessingApplication === app.id}
                                  >
                                    {isProcessingApplication === app.id ? <Loader2 className="animate-spin mr-2" /> : <ThumbsUp className="mr-2 h-4 w-4" />}
                                    Accept
                                  </Button>
                                </>
                              )}
                            </CardFooter>
                          </Card>
                        ))}
                        {projectApplications.filter(app => app.status === 'pending').length === 0 && projectApplications.length > 0 &&
                          <p className="text-muted-foreground text-center py-4">No pending applications. Check archived applications below if the project is no longer open.</p>
                        }
                      </div>
                    )
              }
            </CardContent>
          </Card>
        )}
        {(isClientOwner || user?.role === 'admin') && project.status !== "Open" && projectApplications.length > 0 && (
          <Card className="shadow-lg mt-8">
            <CardHeader><CardTitle className="text-xl flex items-center"><UsersRound className="mr-2 h-5 w-5 text-primary" />Archived Applications</CardTitle></CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">This project is no longer open for new applications or has been assigned. Below are the applications received.</p>
              <div className="space-y-4 mt-4">
                {projectApplications.map(app => (
                  <Card key={app.id} className={'opacity-70 bg-muted/50'}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{app.developerName}</CardTitle>
                          <CardDescription>Applied: {app.appliedAt ? formatDistanceToNow(safeCreateDateLocal(app.appliedAt) || new Date(0), { addSuffix: true }) : 'Unknown'}</CardDescription>
                        </div>
                        <ApplicationStatusBadge status={app.status} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      {app.messageToClient && <p className="text-sm text-muted-foreground p-2 bg-background/50 rounded-sm"><em>"{app.messageToClient}"</em></p>}
                    </CardContent>
                    <CardFooter>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/developers/${app.developerId}`} target="_blank">
                          <UserCheck className="mr-2 h-4 w-4" /> View Profile
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </ProtectedPage>
  );
}


function ProjectStatusBadge({ status }: { status?: ProjectType["status"] }) {
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
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor} whitespace-nowrap`}>
      <svg className={`-ml-0.5 mr-1.5 h-2 w-2 ${dotColor} hidden sm:block`} fill="currentColor" viewBox="0 0 8 8">
        <circle cx="4" cy="4" r="3" />
      </svg>
      {icon}
      {currentStatus}
    </span>
  );
}

function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  let bgColor = "bg-muted text-muted-foreground";
  let icon;

  switch (status) {
    case "pending":
      bgColor = "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 dark:bg-yellow-700/30";
      icon = <Clock className="mr-1.5 h-3 w-3" />;
      break;
    case "accepted":
      bgColor = "bg-green-500/20 text-green-700 dark:text-green-300 dark:bg-green-700/30";
      icon = <CheckCircle className="mr-1.5 h-3 w-3" />;
      break;
    case "rejected":
      bgColor = "bg-red-500/20 text-red-700 dark:text-red-300 dark:bg-red-700/30";
      icon = <ThumbsDown className="mr-1.5 h-3 w-3" />;
      break;
    default:
      bgColor = "bg-gray-500/20 text-gray-700 dark:text-gray-300 dark:bg-gray-700/30";
      icon = <Info className="mr-1.5 h-3 w-3" />;
  }

  return (
    <Badge variant="outline" className={`border-transparent ${bgColor}`}>
      {icon}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}
