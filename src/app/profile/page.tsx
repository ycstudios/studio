
"use client";

import React, { useEffect, useState, useTransition } from "react";
import { ProtectedPage } from "@/components/ProtectedPage";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Edit3, Save, UserCircle2, Briefcase, Palette, Loader2, AlertTriangle } from "lucide-react";
import { getUserById, updateUser } from "@/lib/firebaseService";
import type { User } from "@/types";

export default function ProfilePage() {
  const { user: authUser, login: updateAuthContextUser, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState(""); 
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState(""); 
  const [avatar, setAvatar] = useState("");

  // Store initial fetched data to revert on cancel
  const [initialData, setInitialData] = useState<Partial<User>>({});


  useEffect(() => {
    if (authUser?.id && !authLoading) {
      const fetchUserData = async () => {
        setIsLoadingProfile(true);
        setFetchError(null);
        try {
          const fetchedUser = await getUserById(authUser.id);
          if (fetchedUser) {
            setName(fetchedUser.name || "");
            setEmail(fetchedUser.email || "");
            setBio(fetchedUser.bio || (fetchedUser.role === 'developer' ? "Skilled developer ready for new challenges." : "Client looking for expert developers."));
            setSkills(fetchedUser.skills?.join(", ") || (fetchedUser.role === 'developer' ? "" : ""));
            setAvatar(fetchedUser.avatarUrl || `https://placehold.co/150x150.png`);
            setInitialData({ // Store initial data for cancel
              name: fetchedUser.name,
              bio: fetchedUser.bio,
              skills: fetchedUser.skills,
              avatarUrl: fetchedUser.avatarUrl
            });
          } else {
            setFetchError("Could not load profile data from the database.");
            toast({ title: "Error", description: "User data not found in database.", variant: "destructive" });
          }
        } catch (e) {
          console.error("Failed to fetch user data:", e);
          const errorMsg = e instanceof Error ? e.message : "Failed to load profile data.";
          setFetchError(errorMsg);
          toast({ title: "Error", description: errorMsg, variant: "destructive" });
        } finally {
          setIsLoadingProfile(false);
        }
      };
      fetchUserData();
    } else if (!authLoading) { // No authUser ID, but auth context has loaded
      setIsLoadingProfile(false);
      setFetchError("User not authenticated.");
    }
  }, [authUser?.id, authLoading, toast]);

  const handleEditToggle = () => {
    if (isEditing) { // If was editing and now cancelling
      setName(initialData.name || authUser?.name || "");
      setBio(initialData.bio || authUser?.bio || (authUser?.role === 'developer' ? "Skilled developer ready for new challenges." : "Client looking for expert developers."));
      setSkills(initialData.skills?.join(", ") || authUser?.skills?.join(", ") || (authUser?.role === 'developer' ? "" : ""));
      setAvatar(initialData.avatarUrl || authUser?.avatarUrl || `https://placehold.co/150x150.png`);
    }
    setIsEditing(!isEditing);
  };

  const handleSaveChanges = async () => {
    if (!authUser?.id) {
      toast({ title: "Error", description: "User not found.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    setFetchError(null);

    const skillsArray = skills.split(",").map(s => s.trim()).filter(s => s.length > 0);
    const updatedData: Partial<Omit<User, 'id' | 'createdAt' | 'email' | 'role' | 'avatarUrl'>> = { 
      name, 
      bio 
    };
    if (authUser.role === 'developer') {
      updatedData.skills = skillsArray;
    }
    // Avatar update logic would go here if implemented (e.g., updatedData.avatarUrl = newAvatarUrl)

    try {
      await updateUser(authUser.id, updatedData);
      
      // Update AuthContext immediately for responsive UI
      const updatedAuthUser = { 
        ...authUser, 
        name, 
        bio, 
        skills: authUser.role === 'developer' ? skillsArray : authUser.skills,
        // avatarUrl would be updated if changed
      };
      updateAuthContextUser(updatedAuthUser);
      setInitialData({ ...initialData, name, bio, skills: skillsArray }); // Update initial data to new saved state
      
      setIsEditing(false);
      toast({ title: "Profile Updated", description: "Your changes have been saved to the database." });
    } catch (e) {
      console.error("Failed to save profile:", e);
      const errorMsg = e instanceof Error ? e.message : "Failed to save profile changes.";
      setFetchError(errorMsg);
      toast({ title: "Save Error", description: errorMsg, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };
  
  const getInitials = (nameStr: string) => {
    if (!nameStr) return "?";
    const names = nameStr.split(' ');
    if (names.length > 1 && names[0] && names[names.length - 1]) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return nameStr.substring(0, 2).toUpperCase();
  };

  if (authLoading || isLoadingProfile) {
    return (
      <ProtectedPage>
        <div className="container mx-auto p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
          <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </ProtectedPage>
    );
  }

  if (fetchError || !authUser) {
     return (
      <ProtectedPage>
        <div className="container mx-auto p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
          <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
          <h1 className="text-2xl font-semibold mb-2">Error Loading Profile</h1>
          <p className="text-muted-foreground text-center">{fetchError || "User data could not be loaded or you are not authenticated."}</p>
        </div>
      </ProtectedPage>
    );
  }


  return (
    <ProtectedPage>
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
            <p className="text-muted-foreground">Manage your account settings and public profile (data from Firestore).</p>
          </div>
          <Button onClick={handleEditToggle} variant={isEditing ? "secondary" : "default"} className="w-full sm:w-auto" disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEditing ? <Save className="mr-2 h-4 w-4" /> : <Edit3 className="mr-2 h-4 w-4" />)}
            {isSaving ? "Saving..." : (isEditing ? "Cancel Edit" : "Edit Profile")}
          </Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Profile Card */}
          <Card className="md:col-span-1 shadow-lg">
            <CardHeader className="items-center text-center">
               <Avatar className="h-24 w-24 mb-4 ring-2 ring-primary ring-offset-2">
                <AvatarImage src={avatar || `https://placehold.co/150x150.png`} alt={name} data-ai-hint="profile picture" />
                <AvatarFallback>{getInitials(name)}</AvatarFallback>
              </Avatar>
              <CardTitle className="text-2xl">{name}</CardTitle>
              <CardDescription className="capitalize flex items-center justify-center gap-1">
                {authUser.role === "client" ? <Briefcase className="h-4 w-4" /> : <UserCircle2 className="h-4 w-4" />}
                {authUser.role}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">{email}</p>
              {isEditing && (
                <Button variant="outline" size="sm" className="mt-4" disabled>
                  <Palette className="mr-2 h-4 w-4" /> Change Avatar (Future Feature)
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Profile Details Form/Display */}
          <Card className="md:col-span-2 shadow-lg">
            <CardHeader>
              <CardTitle>Profile Details</CardTitle>
              <CardDescription>
                {isEditing ? "Update your information below." : "View your current profile information."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="name">Full Name</Label>
                {isEditing ? (
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={isSaving}/>
                ) : (
                  <p className="text-lg font-medium p-2 border rounded-md bg-muted/30 min-h-[40px]">{name || <span className="italic text-muted-foreground">Not set</span>}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="email">Email Address</Label>
                 <p className="text-lg p-2 border rounded-md bg-muted/30 text-muted-foreground min-h-[40px]">{email} (Not editable)</p>
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                {isEditing ? (
                  <Textarea id="bio" placeholder="Tell us about yourself..." className="min-h-[100px]" value={bio} onChange={(e) => setBio(e.target.value)} disabled={isSaving} />
                ) : (
                  <p className="text-sm p-3 border rounded-md bg-muted/30 min-h-[60px] whitespace-pre-wrap">{bio || <span className="italic text-muted-foreground">No bio provided.</span>}</p>
                )}
              </div>

              {authUser.role === "developer" && (
                 <div>
                  <Label htmlFor="skills">Skills</Label>
                  {isEditing ? (
                    <Input id="skills" placeholder="e.g., JavaScript, React, Figma" value={skills} onChange={(e) => setSkills(e.target.value)} disabled={isSaving} />
                  ) : (
                    <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted/30 min-h-[40px]">
                      {(skills.split(",").map(s => s.trim()).filter(s => s).length > 0 ? skills.split(",").map(s => s.trim()).filter(s => s) : ["No skills listed"]).map((skill, index) => (
                        <span key={index} className={`px-2 py-1 text-xs rounded-md ${skill === "No skills listed" ? "text-muted-foreground italic" : "bg-primary/10 text-primary font-medium"}`}>{skill}</span>
                      ))}
                    </div>
                  )}
                  {isEditing && <p className="text-xs text-muted-foreground mt-1">Enter skills separated by commas.</p>}
                </div>
              )}
              
              {isEditing && (
                <Button onClick={handleSaveChanges} className="w-full md:w-auto" disabled={isSaving || !name}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                   {isSaving ? "Saving Changes..." : "Save All Changes"}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <Separator className="my-12" />
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
            <CardDescription>Manage other account preferences.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Further settings like password changes, notification preferences, and account deletion would be managed here. (Placeholder)
            </p>
             <Button variant="destructive" className="mt-4" disabled>Delete Account (Disabled)</Button>
          </CardContent>
        </Card>
      </div>
    </ProtectedPage>
  );
}
