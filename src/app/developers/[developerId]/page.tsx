
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Briefcase, UserCircle2, FileText, AlertTriangle, Info, Loader2, Link as LinkIcon, DollarSign, ExternalLink, Mail } from "lucide-react";
import type { User as UserType } from "@/types";
import { getUserById } from "@/lib/firebaseService";
import { format } from "date-fns";
import Link from "next/link";

export default function PublicDeveloperProfilePage() {
  const params = useParams();
  const router = useRouter();
  const developerId = params.developerId as string;

  const [developer, setDeveloper] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDeveloper = useCallback(async () => {
    if (!developerId) {
      setIsLoading(false);
      setError("Developer ID is missing from the URL.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const fetchedUser = await getUserById(developerId);
      if (fetchedUser && fetchedUser.role === 'developer' && fetchedUser.accountStatus === 'active') {
        setDeveloper(fetchedUser);
      } else if (fetchedUser && (fetchedUser.role !== 'developer' || fetchedUser.accountStatus !== 'active')) {
        setError("This profile is not for an active developer.");
      } 
      else {
        setError(`Developer with ID '${developerId}' not found or is not an active developer.`);
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Could not retrieve developer details.";
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [developerId]);

  useEffect(() => {
    fetchDeveloper();
  }, [fetchDeveloper]);

  const getInitials = (name?: string) => {
    if (!name) return "DV";
    const names = name.split(' ');
    if (names.length > 1 && names[0] && names[names.length - 1]) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading developer profile...</p>
      </div>
    );
  }

  if (error || !developer) {
    return (
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <Alert variant="destructive" className="max-w-xl mx-auto">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Profile Not Available</AlertTitle>
          <AlertDescription>
            {error || `The developer profile you're looking for could not be found or is not currently active.`}
          </AlertDescription>
        </Alert>
        <div className="text-center mt-6">
          <Button onClick={() => router.push('/developers')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Developers List
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <Button onClick={() => router.push('/developers')} variant="outline" className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Developers List
      </Button>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="md:col-span-1 shadow-lg">
          <CardHeader className="items-center text-center">
            <Avatar className="h-24 w-24 mb-4 ring-2 ring-primary ring-offset-2">
              <AvatarImage src={developer.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(developer.name || 'User')}&background=random&size=100`} alt={developer.name || 'Developer'} data-ai-hint="developer profile avatar" />
              <AvatarFallback>{getInitials(developer.name)}</AvatarFallback>
            </Avatar>
            <CardTitle className="text-2xl">{developer.name || "Unnamed Developer"}</CardTitle>
            <CardDescription className="capitalize flex items-center justify-center gap-1">
              <UserCircle2 className="h-4 w-4" />
              Developer
            </CardDescription>
            {developer.hourlyRate !== undefined && (
              <p className="text-sm text-primary font-semibold mt-1 flex items-center justify-center gap-1">
                <DollarSign className="h-4 w-4" /> ${developer.hourlyRate}/hr
              </p>
            )}
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground flex items-center justify-center gap-1.5">
                <Mail className="h-4 w-4" /> {developer.email}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Joined: {developer.createdAt ? format(developer.createdAt instanceof Date ? developer.createdAt : new Date((developer.createdAt as any).seconds * 1000), 'PPP') : 'N/A'}
            </p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 shadow-lg">
          <CardHeader>
            <CardTitle>Developer Profile</CardTitle>
            <CardDescription>Public profile for {developer.name || "this developer"}.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {developer.bio && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Bio</h3>
                <p className="text-base text-foreground bg-muted/30 p-3 rounded-md whitespace-pre-wrap">{developer.bio}</p>
              </div>
            )}

            {developer.skills && developer.skills.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {developer.skills.map((skill, index) => (
                    <Badge key={index} variant="secondary">{skill}</Badge>
                  ))}
                </div>
              </div>
            )}

            {developer.experienceLevel && (
              <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1 mt-2">Experience Level</h3>
                  <p className="text-base">{developer.experienceLevel}</p>
              </div>
            )}
            
            {developer.portfolioUrls && developer.portfolioUrls.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1 mt-2">Portfolio & Links</h3>
                <ul className="space-y-1">
                  {developer.portfolioUrls.map((url, index) => (
                      <li key={index} className="text-sm flex items-center">
                      <LinkIcon className="h-3 w-3 mr-1.5 text-muted-foreground" />
                      <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate flex items-center gap-1">
                          {url} <ExternalLink className="h-3 w-3 opacity-70" />
                      </a>
                      </li>
                  ))}
                </ul>
              </div>
            )}

            {developer.resumeFileUrl && (
                <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1 mt-2">Resume</h3>
                    <a href={developer.resumeFileUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-base flex items-center gap-1">
                        <FileText className="h-4 w-4" /> {developer.resumeFileName || "View Resume"} <ExternalLink className="h-3 w-3 opacity-70" />
                    </a>
                </div>
            )}
            
            {developer.pastProjects && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1 mt-2">Past Project Highlights</h3>
                <p className="text-base text-foreground bg-muted/30 p-3 rounded-md whitespace-pre-wrap">{developer.pastProjects}</p>
              </div>
            )}

             {!developer.bio && (!developer.skills || developer.skills.length === 0) && !developer.experienceLevel && (
                <p className="text-muted-foreground italic">This developer has not yet provided detailed profile information.</p>
             )}

          </CardContent>
           <CardFooter>
            {/* Placeholder for future actions like "Contact via CodeCrafter" or "Invite to Project" */}
            <Button variant="default" disabled>
                Contact Developer (via CodeCrafter - Coming Soon)
            </Button>
           </CardFooter>
        </Card>
      </div>
    </div>
  );
}
