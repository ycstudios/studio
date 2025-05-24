
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProtectedPage } from "@/components/ProtectedPage";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowLeft, Briefcase, UserCircle2, FileText, AlertTriangle, Info, Loader2, Flag, ShieldCheck, ShieldX, Link as LinkIcon, CheckSquare, XSquare, ShieldAlert, Clock } from "lucide-react";
import type { User as UserType, AccountStatus } from "@/types";
import { getUserById, toggleUserFlag, addAdminActivityLog, updateUserAccountStatus } from "@/lib/firebaseService"; 
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

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
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

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

  const handleUpdateAccountStatus = async (newStatus: AccountStatus) => {
    if (!adminUser || !user) {
      toast({ title: "Error", description: "Admin or target user data not available.", variant: "destructive" });
      return;
    }
    setIsUpdatingStatus(true);
    try {
      await updateUserAccountStatus(user.id, newStatus, user.email, user.name);
      const action = newStatus === 'active' ? 'DEVELOPER_APPROVED' : (newStatus === 'rejected' ? 'DEVELOPER_REJECTED' : `STATUS_CHANGED_TO_${newStatus.toUpperCase()}`);
      await addAdminActivityLog({
        adminId: adminUser.id,
        adminName: adminUser.name || "Admin",
        action: action,
        targetType: "user",
        targetId: user.id,
        targetName: user.name || "Unnamed User",
        details: { newAccountStatus: newStatus }
      });
      const updatedUser = await getUserById(user.id);
      if (updatedUser) {
        setUser(updatedUser);
        updateSingleUserInList(updatedUser);
      }
      toast({
        title: "Account Status Updated",
        description: `${user.name || "User"}'s account has been ${newStatus === 'active' ? 'approved' : (newStatus === 'rejected' ? 'rejected' : `set to ${newStatus}`)}.`,
      });
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Could not update account status.";
      toast({ title: "Error", description: errorMsg, variant: "destructive" });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    const names = name.split(' ');
    if (names.length > 1 && names[0] && names[names.length - 1]) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
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

  const capitalizedStatus = user.accountStatus.charAt(0).toUpperCase() + user.accountStatus.slice(1).replace(/_/g, ' ');

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
                <AvatarImage src={user.avatarUrl || `https://placehold.co/100x100.png`} alt={user.name || 'User'} data-ai-hint="profile avatar" />
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
               <AccountStatusBadge status={user.accountStatus} className="mt-2" />
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Joined: {user.createdAt ? format(user.createdAt instanceof Date ? user.createdAt : new Date((user.createdAt as any).seconds * 1000), 'PPP') : 'N/A'}
              </p>
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
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Account Status</h3>
                <p className="text-lg flex items-center gap-1.5">
                  <AccountStatusIcon status={user.accountStatus} className="h-5 w-5" />
                  {capitalizedStatus}
                </p>
              </div>
              {user.bio && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Bio</h3>
                  <p className="text-base text-foreground bg-muted/30 p-3 rounded-md whitespace-pre-wrap">{user.bio}</p>
                </div>
              )}
              {user.role === "developer" && (
                <>
                  {user.skills && user.skills.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Skills</h3>
                      <div className="flex flex-wrap gap-2">
                        {user.skills.map((skill, index) => (
                          <Badge key={index} variant="secondary">{skill}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {(!user.skills || user.skills.length === 0) && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Skills</h3>
                      <p className="italic text-muted-foreground">No skills listed.</p>
                    </div>
                  )}
                  
                  {user.experienceLevel && (
                    <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-1 mt-2">Experience Level</h3>
                        <p className="text-base">{user.experienceLevel}</p>
                    </div>
                  )}
                  {(!user.experienceLevel) && (
                     <div>
                        <h3 className="text-sm font-medium text-muted-foreground mb-1 mt-2">Experience Level</h3>
                        <p className="italic text-muted-foreground">Not specified.</p>
                    </div>
                  )}

                  {user.portfolioUrls && user.portfolioUrls.length > 0 && (
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
                  {(!user.portfolioUrls || user.portfolioUrls.length === 0) && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1 mt-2">Portfolio URLs</h3>
                      <p className="italic text-muted-foreground">No portfolio URLs listed.</p>
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1 mt-2">Resume</h3>
                    {user.resumeFileUrl ? (
                         <a href={user.resumeFileUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-base flex items-center gap-1">
                           <FileText className="h-4 w-4" /> {user.resumeFileName || "View Resume"}
                         </a>
                    ) : <p className="italic text-muted-foreground">No resume URL provided.</p>}
                  </div>

                  {user.pastProjects && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1 mt-2">Past Project Highlights</h3>
                      <p className="text-base text-foreground bg-muted/30 p-3 rounded-md whitespace-pre-wrap">{user.pastProjects}</p>
                    </div>
                  )}
                   {(!user.pastProjects) && (
                    <div>
                      <h3 className="text-sm font-medium text-muted-foreground mb-1 mt-2">Past Project Highlights</h3>
                      <p className="italic text-muted-foreground">No past projects described.</p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
            <CardFooter className="flex-wrap gap-2">
              <Button 
                variant={user.isFlagged ? "default" : "destructive"} 
                onClick={handleToggleFlag} 
                disabled={isTogglingFlag || isUpdatingStatus}
              >
                {isTogglingFlag ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Flag className="mr-2 h-4 w-4" />}
                {isTogglingFlag ? (user.isFlagged ? "Unflagging..." : "Flagging...") : (user.isFlagged ? "Unflag User" : "Flag User")}
              </Button>
              {user.role === 'developer' && user.accountStatus === 'pending_approval' && (
                <>
                  <Button
                    variant="outline"
                    className="border-green-500 text-green-600 hover:bg-green-500/10"
                    onClick={() => handleUpdateAccountStatus('active')}
                    disabled={isUpdatingStatus || isTogglingFlag}
                  >
                    {isUpdatingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckSquare className="mr-2 h-4 w-4" />}
                    Approve Developer
                  </Button>
                  <Button
                    variant="outline"
                    className="border-destructive text-destructive hover:bg-destructive/10"
                    onClick={() => handleUpdateAccountStatus('rejected')}
                    disabled={isUpdatingStatus || isTogglingFlag}
                  >
                    {isUpdatingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : <XSquare className="mr-2 h-4 w-4" />}
                    Reject Developer
                  </Button>
                </>
              )}
            </CardFooter>
          </Card>
        </div>

        {/* Placeholder for more detailed activity/history specific to this user */}
        <Card className="mt-8 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2 h-5 w-5 text-primary" /> User Activity & History (Placeholder)
            </CardTitle>
            <CardDescription>Overview of user's interactions and history on the platform.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
              <Info className="h-8 w-8 text-muted-foreground mr-3" />
              <p className="text-muted-foreground">
                {user.role === "client" ? "Client project history, submitted projects, and communication logs will appear here." : "Developer project applications, completed projects, and engagement metrics will appear here."}
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

function AccountStatusBadge({ status, className }: { status?: UserType["accountStatus"]; className?: string }) {
  let bgColor = "bg-muted text-muted-foreground";
  let icon = <Clock className="h-4 w-4" />;
  let currentStatus = status || "unknown";
  let capitalizedStatus = currentStatus.charAt(0).toUpperCase() + currentStatus.slice(1).replace(/_/g, ' ');

  if (currentStatus === "active") {
    bgColor = "bg-green-500/20 text-green-700 dark:text-green-300";
    icon = <CheckSquare className="h-4 w-4" />;
  } else if (currentStatus === "pending_approval") {
    bgColor = "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300";
    icon = <Clock className="h-4 w-4" />;
  } else if (currentStatus === "rejected") {
    bgColor = "bg-red-500/20 text-red-700 dark:text-red-300";
    icon = <XSquare className="h-4 w-4" />;
  } else if (currentStatus === "suspended") {
    bgColor = "bg-orange-500/20 text-orange-700 dark:text-orange-300";
    icon = <ShieldAlert className="h-4 w-4" />;
  } else { 
     bgColor = "bg-gray-500/20 text-gray-700 dark:text-gray-300";
     icon = <Info className="h-4 w-4" />;
     capitalizedStatus = "Unknown";
  }

  return (
    <Badge variant="outline" className={`border-transparent ${bgColor} ${className}`}>
      {React.cloneElement(icon, {className: "mr-1.5 h-3.5 w-3.5"})}
      {capitalizedStatus}
    </Badge>
  );
}

function AccountStatusIcon({ status, className }: { status?: UserType["accountStatus"]; className?: string }) {
  if (status === "active") return <CheckSquare className={`text-green-600 ${className}`} />;
  if (status === "pending_approval") return <Clock className={`text-yellow-600 ${className}`} />;
  if (status === "rejected") return <XSquare className={`text-destructive ${className}`} />;
  if (status === "suspended") return <ShieldAlert className={`text-orange-600 ${className}`} />;
  return <Info className={`text-muted-foreground ${className}`} />;
}
