
"use client";

import { ProtectedPage } from "@/components/ProtectedPage";
import { DeveloperCard } from "@/components/DeveloperCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Info } from "lucide-react";
import { useParams } from "next/navigation";
import React, { useEffect, useState } from "react";
// Assuming matchDevelopers and related types are available if needed here
// import { matchDevelopers, MatchDevelopersInput, MatchDevelopersOutput } from "@/ai/flows/match-developers";
// import type { Project } from "@/types"; // Assuming Project type exists

// This is a mock. In a real app, you'd fetch project details and matches.
interface MockProjectDetails {
  id: string;
  name: string;
  description: string;
  requiredSkills: string[];
  // ... other project fields
}

interface MockMatchmakingResult {
  developerMatches: { name: string; description: string; skills: string[], dataAiHint: string }[];
  reasoning: string;
}

export default function ProjectMatchmakingPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [project, setProject] = useState<MockProjectDetails | null>(null);
  const [matches, setMatches] = useState<MockMatchmakingResult | null>(null);

  useEffect(() => {
    // Simulate fetching project data and matches
    // In a real app, this would be an API call
    const fetchProjectData = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate delay

      // Mock data - replace with actual fetching logic
      const mockProject: MockProjectDetails = {
        id: projectId,
        name: `Project ${projectId}`,
        description: `This is a detailed description for Project ${projectId}. It involves building a cutting-edge web application with modern technologies to solve a complex business problem.`,
        requiredSkills: ["React", "TypeScript", "Node.js", "GraphQL"],
      };

      const mockMatches: MockMatchmakingResult = {
        developerMatches: [
          { name: "Alice Wonderland", description: "Experienced full-stack developer with 5+ years in React and Node.js. Specializes in e-commerce solutions.", skills: ["React", "Node.js", "TypeScript", "AWS"], dataAiHint: "female developer coding" },
          { name: "Bob The Builder", description: "Frontend expert focused on UI/UX and performance optimization. Proficient in Next.js and Tailwind CSS.", skills: ["Next.js", "TailwindCSS", "Figma", "JavaScript"], dataAiHint: "male developer computer" },
        ],
        reasoning: "Alice is a strong match due to her full-stack experience and e-commerce specialization. Bob offers excellent frontend skills aligning with UI needs.",
      };
      
      setProject(mockProject);
      setMatches(mockMatches);
      setIsLoading(false);
      toast({ title: "Project Data Loaded", description: `Details and matches for Project ${projectId} are ready.` });
    };

    if (projectId) {
      fetchProjectData();
    }
  }, [projectId, toast]);

  if (isLoading) {
    return (
      <ProtectedPage allowedRoles={["client"]}>
        <div className="container mx-auto p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
          <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground text-lg">Loading project details and matches...</p>
        </div>
      </ProtectedPage>
    );
  }

  if (!project) {
    return (
      <ProtectedPage allowedRoles={["client"]}>
        <div className="container mx-auto p-4 md:p-6 lg:p-8 text-center">
          <Info className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-semibold mb-2">Project Not Found</h1>
          <p className="text-muted-foreground">We couldn&apos;t find the details for this project. It might have been removed or the ID is incorrect.</p>
        </div>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage allowedRoles={["client"]}>
      <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl">{project.name}</CardTitle>
            <CardDescription>Project ID: {project.id}</CardDescription>
          </CardHeader>
          <CardContent>
            <h3 className="font-semibold mb-1 text-lg">Project Description:</h3>
            <p className="text-muted-foreground mb-4">{project.description}</p>
            <h3 className="font-semibold mb-1 text-lg">Required Skills:</h3>
            <div className="flex flex-wrap gap-2">
              {project.requiredSkills.map(skill => <span key={skill} className="px-3 py-1 bg-secondary text-secondary-foreground text-sm rounded-full">{skill}</span>)}
            </div>
          </CardContent>
        </Card>

        {matches && (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">AI Developer Matches</CardTitle>
              <CardDescription>Here are the developers our AI believes are a good fit for your project.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2 text-lg">AI Reasoning:</h3>
                <p className="text-sm text-muted-foreground bg-muted p-4 rounded-md border">{matches.reasoning}</p>
              </div>
              
              <h3 className="font-semibold text-lg">Matched Developer Profiles:</h3>
              {matches.developerMatches.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {matches.developerMatches.map((dev, index) => (
                    <DeveloperCard 
                      key={index} 
                      name={dev.name}
                      description={dev.description}
                      skills={dev.skills}
                      dataAiHint={dev.dataAiHint}
                      // Add other relevant fields if available from AI: availability, timezone, avatarUrl
                    />
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No specific developer profiles were matched by the AI for this project yet.</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </ProtectedPage>
  );
}
