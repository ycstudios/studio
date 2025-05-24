
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProtectedPage } from "@/components/ProtectedPage";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Briefcase, UserCircle2, FileText, AlertTriangle, Info, Loader2, Flag, ShieldCheck, ShieldX, Link as LinkIcon } from "lucide-react";
import type { User as UserType } from "@/types";
import { getUserById, toggleUserFlag, addAdminActivityLog } from "@/lib/firebaseService"; 
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;
  const { toast } = useToast();
  const { user: adminUser, updateSingleUserInList } = useAuth();

  const [user, setUser] = useState<UserType | null>(null); 
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTogglingFlag, setIsTogglingFlag] = useState(false);

  const fetchUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedUser = await getUserById(userId);
      if (fetchedUser) {
        setUser(fetchedUser);
      } else {
        setError(`User with ID '${userId}' not found in the database.`);
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Could not retrieve user details."
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchUser();
    } else {
      setIsLoading(false);
      setError("No user ID provided.");
    }
  }, [userId, fetchUser]);

  const handleToggleFlag = async () => {
    if (!adminUser || !user) {
      toast({ title: "Error", description: "Admin or target user data not available.", variant: "destructive" });
      return;
    }
    setIsTogglingFlag(true);
    try {
      await toggleUserFlag(user.id, user.isFlagged || false);
      const action = !(user.isFlagged || false) ? "USER_FLAGGED" : "USER_UNFLAGGED";
      await addAdminActivityLog({
        adminId: adminUser.id,
        adminName: adminUser.name || "Admin",
        action: action,
        targetType: "user",
        targetId: user.id,
        targetName: user.name || "Unnamed User",
        details: { newFlagStatus: !(user.isFlagged || false) }
      });
      
      const updatedUser = await getUserById(user.id);
      if (updatedUser) {
        setUser(updatedUser); 
        updateSingleUserInList(updatedUser); 
      }

      toast({
        title: "User Flag Status Updated",
        description: `${user.name || "User"}'s flag status has been updated.`,
      });
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Could not update user flag status.";
      toast({ title: "Error", description: errorMsg, variant: "destructive" });
    } finally {
      setIsTogglingFlag(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    const names = name.split(' ');
    if (names.length > 1 && names[0] && names[names.length -1]) {
      return `${names[0][0]}${names[names.length - 1][0]}`;
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (isLoading) { 
    return (
      <ProtectedPage allowedRoles={["admin"]}>
        <div className="container mx-auto p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
          <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading user details...</p>
        </div>
      </ProtectedPage>
    );
  }

  if (error || !user) { 
    return (
      <ProtectedPage allowedRoles={["admin"]}>
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
          <Alert variant="destructive" className="max-w-xl mx-auto">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error Loading User</AlertTitle>
            <AlertDescription>
              {error || `The user with ID '${userId}' could not be found or an error occurred while fetching their data.`}
            </AlertDescription>
          </Alert>
          <div className="text-center mt-6">
            <Button onClick={() => router.push('/admin')} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" /> Go Back to Admin Panel
            </Button>
          </div>
        </div>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage allowedRoles={["admin"]}>
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <Button onClick={() => router.push('/admin')} variant="outline" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Admin Panel
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="md:col-span-1 shadow-lg">
            <CardHeader className="items-center text-center">
              <Avatar className="h-24 w-24 mb-4 ring-2 ring-primary ring-offset-2">
                <AvatarImage src={user.avatarUrl || `https://placehold.co/150x150.png`} alt={user.name || 'User'} data-ai-hint="profile avatar" />
                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <CardTitle className="text-2xl">{user.name || "Unnamed User"}</CardTitle>
              <CardDescription className="capitalize flex items-center justify-center gap-1">
                {user.role === "client" ? <Briefcase className="h-4 w-4" /> : <UserCircle2 className="h-4 w-4" />}
                {user.role}
              </CardDescription>
              {user.isFlagged && (
                <Badge variant="destructive" className="mt-2 flex items-center gap-1.5">
                  <ShieldX className="h-4 w-4" /> User Flagged
                </Badge>
              )}
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 shadow-lg">
            <CardHeader>
              <CardTitle>User Details</CardTitle>
              <CardDescription>Viewing profile information for {user.name || "this user"} from Firestore.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Full Name</h3>
                <p className="text-lg">{user.name || <span className="italic text-muted-foreground">Not provided</span>}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Email Address</h3>
                <p className="text-lg">{user.email}</p>
              </div>
               <div>
                <h3 className="text-sm font-medium text-muted-foreground">Flag Status</h3>
                <p className={`text-lg flex items-center gap-1.5 ${user.isFlagged ? 'text-destructive' : 'text-green-600'}`}>
                  {user.isFlagged ? <ShieldX className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
                  {user.isFlagged ? 'Flagged' : 'Not Flagged'}
                </p>
              </div>
              {user.bio && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Bio</h3>
                  <p className="text-base text-foreground bg-muted/30 p-3 rounded-md whitespace-pre-wrap">{user.bio}</p>
                </div>
              )}
              {user.role === "developer" && user.skills && user.skills.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {user.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                </div>
              )}
               {user.role === "developer" && (!user.skills || user.skills.length === 0) && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Skills</h3>
                  <p className="italic text-muted-foreground">No skills listed.</p>
                </div>
              )}
               {user.role === "developer" && user.portfolioUrls && user.portfolioUrls.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1 mt-2">Portfolio URLs</h3>
                  <ul className="space-y-1">
                    {user.portfolioUrls.map((url, index) => (
                        <li key={index} className="text-sm flex items-center">
                        <LinkIcon className="h-3 w-3 mr-1.5 text-muted-foreground" />
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">{url}</a>
                        </li>
                    ))}
                  </ul>
                </div>
              )}
              {user.role === "developer" && (!user.portfolioUrls || user.portfolioUrls.length === 0) && (
                 <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1 mt-2">Portfolio URLs</h3>
                  <p className="italic text-muted-foreground">No portfolio URLs listed.</p>
                </div>
              )}
              {user.role === "developer" && (
                 <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1 mt-2">Experience Level</h3>
                  <p className="text-base">{user.experienceLevel || <span className="italic text-muted-foreground">Not specified</span>}</p>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                variant={user.isFlagged ? "default" : "destructive"} 
                onClick={handleToggleFlag} 
                disabled={isTogglingFlag}
              >
                {isTogglingFlag ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Flag className="mr-2 h-4 w-4" />}
                {isTogglingFlag ? (user.isFlagged ? "Unflagging..." : "Flagging...") : (user.isFlagged ? "Unflag User" : "Flag User")}
              </Button>
            </CardFooter>
          </Card>
        </div>

        <Card className="mt-8 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5 text-primary" /> User Activity & History
            </CardTitle>
            <CardDescription>Overview of user's interactions and history on the platform.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
              <Info className="h-8 w-8 text-muted-foreground mr-3" />
              <p className="text-muted-foreground">
                {user.role === "client" ? "Client project history, submitted projects, and communication logs will appear here once implemented." : "Developer project applications, completed projects, and engagement metrics will appear here once implemented."}
              </p>
            </div>
          </CardContent>
           <CardFooter className="text-xs text-muted-foreground">
            Note: Full history tracking requires further backend integration.
          </CardFooter>
        </Card>
      </div>
    </ProtectedPage>
  );
}
