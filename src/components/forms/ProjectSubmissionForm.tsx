"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, Zap } from "lucide-react";
import React, { useState, useTransition } from "react";
import { matchDevelopers, MatchDevelopersInput, MatchDevelopersOutput } from "@/ai/flows/match-developers";
import { DeveloperCard } from "@/components/DeveloperCard";
import { addProject } from "@/lib/firebaseService"; 
import { useAuth } from "@/contexts/AuthContext"; 
import type { Project } from "@/types";

const formSchema = z.object({
  projectName: z.string().min(3, { message: "Project name must be at least 3 characters." }),
  projectRequirements: z.string().min(50, { message: "Please provide detailed project requirements (min 50 characters)." }),
  requiredSkills: z.string().min(1, { message: "Please list at least one required skill." }),
  availability: z.string().min(5, { message: "Please describe your availability (e.g., 'Part-time, 10-20 hours/week, flexible hours')." }),
  timeZone: z.string().min(2, { message: "Please specify your time zone (e.g., 'PST', 'GMT+5')." }),
});

export function ProjectSubmissionForm() {
  const { toast } = useToast();
  const { user } = useAuth(); 
  const [isPending, startTransition] = useTransition();
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchDevelopersOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      projectName: "",
      projectRequirements: "",
      requiredSkills: "",
      availability: "",
      timeZone: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
      toast({ title: "Authentication Error", description: "You must be logged in to submit a project.", variant: "destructive" });
      setError("User not authenticated.");
      return;
    }
    if (user.role !== 'client') {
      toast({ title: "Permission Denied", description: "Only clients can submit projects.", variant: "destructive" });
      setError("Only clients can submit projects.");
      return;
    }

    setError(null);
    setMatchResult(null);
    setIsSavingProject(true);

    try {
      // 1. Save Project to Firestore first
      const projectToSave: Omit<Project, 'id' | 'createdAt' | 'status' | 'clientId'> = {
        name: values.projectName,
        description: values.projectRequirements,
        requiredSkills: values.requiredSkills.split(",").map(skill => skill.trim()).filter(skill => skill.length > 0),
        availability: values.availability,
        timeZone: values.timeZone,
      };
      const savedProject = await addProject(projectToSave, user.id, user.email, user.name);

      // 2. Run AI Matchmaking with the saved project's ID
      toast({
        title: "Finding Matches...",
        description: "Our AI is searching for suitable developers for your project.",
      });

      const inputForAI: MatchDevelopersInput = {
        projectId: savedProject.id,
        projectName: savedProject.name,
        projectRequirements: values.projectRequirements,
        requiredSkills: values.requiredSkills.split(",").map(skill => skill.trim()).filter(skill => skill.length > 0),
        availability: values.availability,
        timeZone: values.timeZone,
      };

      const result = await matchDevelopers(inputForAI);
      setMatchResult(result);
      toast({
        title: "Project Saved & Matches Found!",
        description: "Your project has been saved and potential developer matches have been identified.",
      });
      form.reset();

    } catch (e) {
      console.error("Project submission or matchmaking error:", e);
      const errorMessage = (e instanceof Error) ? e.message : "An unexpected error occurred during project submission.";
      setError(errorMessage);
      toast({
        title: "Submission Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSavingProject(false);
    }
  }

  return (
    <div className="space-y-8">
      <Card className="w-full max-w-2xl mx-auto shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center">
            <Zap className="mr-2 h-6 w-6 text-primary" /> Submit Your Project & Find Developers
          </CardTitle>
          <CardDescription>
            Fill in the details below. Our AI will help match you with the best developers, and your project will be saved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="projectName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., New E-commerce Website" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="projectRequirements"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Requirements</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your project in detail. What are the goals, key features, target audience, etc.?"
                        className="min-h-[150px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      The more detail you provide, the better our AI can match you.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="requiredSkills"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Required Skills</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., React, Node.js, Python, UI/UX Design" {...field} />
                    </FormControl>
                    <FormDescription>
                      Enter skills separated by commas.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="availability"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Availability / Project Timeline</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Project start ASAP, flexible meeting times in afternoons" {...field} />
                    </FormControl>
                    <FormDescription>
                      Describe your availability for collaboration and expected project timeline.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="timeZone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Time Zone</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., EST, GMT-5, Europe/London" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isPending || isSavingProject}>
                {(isPending || isSavingProject) ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isPending && !isSavingProject ? "Finding Matches..." : (isSavingProject ? "Saving Project..." : "Processing...")}
                  </>
                ) : (
                  <>
                    <Users className="mr-2 h-4 w-4" /> Find Developers & Save Project
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {isPending && !isSavingProject && !matchResult && (
        <Card className="w-full max-w-2xl mx-auto shadow-xl">
          <CardHeader>
            <CardTitle>Searching for Developers...</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center space-y-4 p-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Our AI is working its magic. This might take a moment.</p>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="w-full max-w-2xl mx-auto border-destructive shadow-xl mt-6">
          <CardHeader>
            <CardTitle className="text-destructive">Operation Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive-foreground">{error}</p>
          </CardContent>
        </Card>
      )}

      {matchResult && !isPending && (
        <Card className="w-full max-w-2xl mx-auto shadow-xl mt-6">
          <CardHeader>
            <CardTitle className="text-2xl">Developer Matches Found!</CardTitle>
            <CardDescription>Based on your project details, here are some potential developers. Your project has also been saved.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Reasoning:</h3>
              <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">{matchResult.reasoning}</p>
            </div>
            
            <h3 className="font-semibold">Matched Profiles:</h3>
            {matchResult.developerMatches.length > 0 ? (
              <div className="space-y-4">
                {matchResult.developerMatches.map((devProfileText, index) => (
                  <DeveloperCard 
                    key={index} 
                    name={`Potential Developer ${index + 1} (AI Suggestion)`}
                    description={devProfileText} 
                    skills={form.getValues("requiredSkills").split(",").map(s => s.trim())}
                    dataAiHint="developer profile abstract"
                    matchQuality="Good Fit" // Example match quality
                  />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">No specific developer profiles were returned by the AI, but the reasoning might provide insights.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
