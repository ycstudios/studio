
"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProtectedPage } from "@/components/ProtectedPage";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Briefcase, UserCircle2, FileText, AlertTriangle, Info, Loader2 } from "lucide-react";
import type { User as UserType } from "@/types";
import { getUserById } from "@/lib/firebaseService"; // Import Firestore service
import { useToast } from "@/hooks/use-toast";

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;
  const { toast } = useToast();

  const [user, setUser] = useState<UserType | null | undefined>(undefined); // undefined: loading, null: not found
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      const fetchUser = async () => {
        setIsLoading(true);
        try {
          const fetchedUser = await getUserById(userId);
          setUser(fetchedUser);
        } catch (error) {
          console.error("Failed to fetch user:", error);
          toast({
            title: "Error Fetching User",
            description: "Could not retrieve user details from the database.",
            variant: "destructive",
          });
          setUser(null); // Set to null on error
        } finally {
          setIsLoading(false);
        }
      };
      fetchUser();
    } else {
      setIsLoading(false);
      setUser(null); // No userId, so no user
    }
  }, [userId, toast]);

  const getInitials = (name: string = "User") => {
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`;
    }
    return name.substring(0, 2).toUpperCase();
  };

  if (isLoading || user === undefined) { // user === undefined means initial loading state
    return (
      <ProtectedPage allowedRoles={["admin"]}>
        <div className="container mx-auto p-4 md:p-8 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
          <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading user details from database...</p>
        </div>
      </ProtectedPage>
    );
  }

  if (!user) { // user === null means user not found or error fetching
    return (
      <ProtectedPage allowedRoles={["admin"]}>
        <div className="container mx-auto p-4 md:p-8 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
          <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
          <h1 className="text-2xl font-semibold mb-2">User Not Found</h1>
          <p className="text-muted-foreground">The user with ID '{userId}' could not be found in the database.</p>
          <Button onClick={() => router.push('/admin')} className="mt-6">
            <ArrowLeft className="mr-2 h-4 w-4" /> Go Back to Admin Panel
          </Button>
        </div>
      </ProtectedPage>
    );
  }

  return (
    <ProtectedPage allowedRoles={["admin"]}>
      <div className="container mx-auto p-4 md:p-8">
        <Button onClick={() => router.push('/admin')} variant="outline" className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Admin Panel
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* User Profile Card */}
          <Card className="lg:col-span-1 shadow-lg">
            <CardHeader className="items-center text-center">
              <Avatar className="h-24 w-24 mb-4 ring-2 ring-primary ring-offset-2">
                <AvatarImage src={user.avatarUrl || `https://placehold.co/150x150.png`} alt={user.name} data-ai-hint="profile avatar" />
                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <CardTitle className="text-2xl">{user.name}</CardTitle>
              <CardDescription className="capitalize flex items-center justify-center gap-1">
                {user.role === "client" ? <Briefcase className="h-4 w-4" /> : <UserCircle2 className="h-4 w-4" />}
                {user.role}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </CardContent>
          </Card>

          {/* User Details */}
          <Card className="lg:col-span-2 shadow-lg">
            <CardHeader>
              <CardTitle>User Details</CardTitle>
              <CardDescription>Viewing profile information for {user.name} from Firestore.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Full Name</h3>
                <p className="text-lg">{user.name}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Email Address</h3>
                <p className="text-lg">{user.email}</p>
              </div>
              {user.bio && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Bio</h3>
                  <p className="text-base text-foreground bg-muted/30 p-3 rounded-md">{user.bio}</p>
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
            </CardContent>
          </Card>
        </div>

        {/* User History Placeholder */}
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
                {user.role === "client" ? "Client project history, submitted projects, and communication logs will appear here once implemented with Firestore." : "Developer project applications, completed projects, and engagement metrics will appear here once implemented with Firestore."}
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
