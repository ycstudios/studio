
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { ProtectedPage } from "@/components/ProtectedPage";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Edit3, Save, UserCircle2, Briefcase, Palette, Loader2, AlertTriangle, Link as LinkIcon, Trash2 } from "lucide-react";
import { getUserById, updateUser } from "@/lib/firebaseService";
import type { User } from "@/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const experienceLevels: User["experienceLevel"][] = ['', 'Entry', 'Junior', 'Mid-level', 'Senior', 'Lead', 'Principal'];


export default function ProfilePage() {
  const { user: authUser, login: updateAuthContextUser, isLoading: authLoading, logout } = useAuth();
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
  const [portfolioUrls, setPortfolioUrls] = useState("");
  const [experienceLevel, setExperienceLevel] = useState<User["experienceLevel"]>('');

  const [initialData, setInitialData] = useState<Partial<User>>({});


  const fetchUserData = useCallback(async () => {
    if (!authUser?.id) return;
    setIsLoadingProfile(true);
    setFetchError(null);
    try {
      const fetchedUser = await getUserById(authUser.id);
      if (fetchedUser) {
        setName(fetchedUser.name || "");
        setEmail(fetchedUser.email || "");
        setBio(fetchedUser.bio || (fetchedUser.role === 'developer' ? "Skilled developer ready for new challenges." : "Client looking for expert developers."));
        setSkills(fetchedUser.skills?.join(", ") || "");
        setAvatar(fetchedUser.avatarUrl || `https://placehold.co/150x150.png`);
        setPortfolioUrls(fetchedUser.portfolioUrls?.join(", ") || "");
        setExperienceLevel(fetchedUser.experienceLevel || '');
        
        setInitialData({ 
          name: fetchedUser.name,
          bio: fetchedUser.bio,
          skills: fetchedUser.skills,
          avatarUrl: fetchedUser.avatarUrl,
          portfolioUrls: fetchedUser.portfolioUrls,
          experienceLevel: fetchedUser.experienceLevel,
        });
      } else {
        setFetchError("Could not load your profile data from the database. It might be missing or an error occurred.");
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Failed to load profile data.";
      setFetchError(errorMsg);
    } finally {
      setIsLoadingProfile(false);
    }
  }, [authUser?.id]);

  useEffect(() => {
    if (authUser?.id && !authLoading) {
      fetchUserData();
    } else if (!authLoading && !authUser) { 
      setIsLoadingProfile(false);
      setFetchError("User not authenticated. Please log in to view your profile.");
    }
  }, [authUser?.id, authLoading, fetchUserData, authUser]);

  const handleEditToggle = () => {
    if (isEditing) { 
      setName(initialData.name || authUser?.name || "");
      setBio(initialData.bio || authUser?.bio || (authUser?.role === 'developer' ? "Skilled developer ready for new challenges." : "Client looking for expert developers."));
      setSkills(initialData.skills?.join(", ") || authUser?.skills?.join(", ") || "");
      setAvatar(initialData.avatarUrl || authUser?.avatarUrl || `https://placehold.co/150x150.png`);
      setPortfolioUrls(initialData.portfolioUrls?.join(", ") || "");
      setExperienceLevel(initialData.experienceLevel || '');
    }
    setIsEditing(!isEditing);
  };

  const handleSaveChanges = async () => {
    if (!authUser?.id) {
      toast({ title: "Error", description: "User not found. Cannot save changes.", variant: "destructive" });
      return;
    }
    if (!name.trim()) {
      toast({ title: "Validation Error", description: "Name cannot be empty.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    setFetchError(null); // Clear previous fetch errors before saving

    const skillsArray = skills.split(",").map(s => s.trim()).filter(s => s.length > 0);
    const portfolioUrlsArray = portfolioUrls.split(",").map(url => url.trim()).filter(url => url.length > 0 && (url.startsWith('http://') || url.startsWith('https://')));

    const updatedData: Partial<Omit<User, 'id' | 'createdAt' | 'email' | 'role' | 'avatarUrl'>> = { 
      name: name.trim(), 
      bio: bio.trim(),
    };

    if (authUser.role === 'developer') {
      updatedData.skills = skillsArray;
      updatedData.portfolioUrls = portfolioUrlsArray;
      updatedData.experienceLevel = experienceLevel;
    }
    
    try {
      await updateUser(authUser.id, updatedData);
      
      // Optimistically update context with potentially processed data
      const updatedAuthUser: User = { 
        ...authUser, 
        name: updatedData.name || authUser.name, 
        bio: updatedData.bio || authUser.bio, 
        skills: authUser.role === 'developer' ? skillsArray : authUser.skills,
        portfolioUrls: authUser.role === 'developer' ? portfolioUrlsArray : authUser.portfolioUrls,
        experienceLevel: authUser.role === 'developer' ? experienceLevel : authUser.experienceLevel,
      };
      updateAuthContextUser(updatedAuthUser); 
      setInitialData(prev => ({ ...prev, ...updatedData, skills: skillsArray, portfolioUrls: portfolioUrlsArray, experienceLevel }));
      
      setIsEditing(false);
      toast({ title: "Profile Updated", description: "Your changes have been saved." });
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Failed to save profile changes.";
      toast({ title: "Save Error", description: errorMsg, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRequestAccountDeletion = () => {
    toast({
      title: "Account Deletion Requested",
      description: "Your request to delete your account has been noted. An administrator will review and process this request. You will be contacted via email.",
      duration: 7000,
    });
  };
  
  const getInitials = (nameStr?: string) => {
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
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
           <Alert variant="destructive" className="max-w-xl mx-auto">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error Loading Profile</AlertTitle>
            <AlertDescription>
              {fetchError || "User data could not be loaded or you are not authenticated."} Please try refreshing or log in again.
            </AlertDescription>
          </Alert>
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
            <p className="text-muted-foreground">Manage your account settings and public profile information from Firestore.</p>
          </div>
          <Button 
            onClick={isEditing && (name.trim() === (initialData.name || authUser?.name || "") && bio.trim() === (initialData.bio || authUser?.bio || "") && skills === (initialData.skills?.join(", ") || authUser?.skills?.join(", ") || "") && portfolioUrls === (initialData.portfolioUrls?.join(", ") || "") && experienceLevel === (initialData.experienceLevel || '')) ? () => setIsEditing(false) : (isEditing ? handleSaveChanges : handleEditToggle)} 
            variant={isEditing ? "default" : "outline"} 
            className="w-full sm:w-auto" 
            disabled={isSaving || (isEditing && !name.trim())}
          >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEditing ? <Save className="mr-2 h-4 w-4" /> : <Edit3 className="mr-2 h-4 w-4" />)}
            {isSaving ? "Saving..." : (isEditing ? (name.trim() !== (initialData.name || authUser?.name || "") || bio.trim() !== (initialData.bio || authUser?.bio || "") || skills !== (initialData.skills?.join(", ") || authUser?.skills?.join(", ") || "") || portfolioUrls !== (initialData.portfolioUrls?.join(", ") || "") || experienceLevel !== (initialData.experienceLevel || '') ? "Save Changes" : "Cancel Edit") : "Edit Profile")}
          </Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
                  <Palette className="mr-2 h-4 w-4" /> Change Avatar (Future)
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="md:col-span-2 shadow-lg">
            <CardHeader>
              <CardTitle>Profile Details</CardTitle>
              <CardDescription>
                {isEditing ? "Update your information below. Changes will be saved to Firestore." : "View your current profile information from Firestore."}
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
                <>
                  <div>
                    <Label htmlFor="skills">Skills</Label>
                    {isEditing ? (
                      <Input id="skills" placeholder="e.g., JavaScript, React, Figma" value={skills} onChange={(e) => setSkills(e.target.value)} disabled={isSaving} />
                    ) : (
                       <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted/30 min-h-[40px]">
                        {(initialData.skills && initialData.skills.length > 0 ? initialData.skills : ["No skills listed"]).map((skill, index) => (
                          <Badge key={index} variant={skill === "No skills listed" ? "outline" : "secondary"} className={skill === "No skills listed" ? "italic text-muted-foreground" : ""}>{skill}</Badge>
                        ))}
                      </div>
                    )}
                    {isEditing && <p className="text-xs text-muted-foreground mt-1">Enter skills separated by commas.</p>}
                  </div>

                  <div>
                    <Label htmlFor="portfolioUrls">Portfolio URLs</Label>
                    {isEditing ? (
                      <Input id="portfolioUrls" placeholder="e.g., https://github.com/user, https://linkedin.com/in/user" value={portfolioUrls} onChange={(e) => setPortfolioUrls(e.target.value)} disabled={isSaving} />
                    ) : (
                      <div className="p-2 border rounded-md bg-muted/30 min-h-[40px]">
                        {initialData.portfolioUrls && initialData.portfolioUrls.length > 0 ? (
                          <ul className="space-y-1">
                            {initialData.portfolioUrls.map((url, index) => (
                              <li key={index} className="text-sm flex items-center">
                                <LinkIcon className="h-3 w-3 mr-1.5 text-muted-foreground flex-shrink-0" />
                                <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate block">{url}</a>
                              </li>
                            ))}
                          </ul>
                        ) : <p className="italic text-muted-foreground">No portfolio URLs listed.</p>}
                      </div>
                    )}
                     {isEditing && <p className="text-xs text-muted-foreground mt-1">Enter valid URLs (http:// or https://) separated by commas.</p>}
                  </div>

                  <div>
                    <Label htmlFor="experienceLevel">Experience Level</Label>
                    {isEditing ? (
                       <Select value={experienceLevel || ''} onValueChange={(value) => setExperienceLevel(value as User["experienceLevel"])} disabled={isSaving}>
                        <SelectTrigger id="experienceLevel">
                          <SelectValue placeholder="Select experience level" />
                        </SelectTrigger>
                        <SelectContent>
                          {experienceLevels.map(level => (
                            <SelectItem key={level || 'none'} value={level || 'none'}>{level || 'Not specified'}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-lg font-medium p-2 border rounded-md bg-muted/30 min-h-[40px]">{initialData.experienceLevel || <span className="italic text-muted-foreground">Not specified</span>}</p>
                    )}
                  </div>
                </>
              )}
              
              {isEditing && (
                <Button 
                  onClick={handleSaveChanges} 
                  className="w-full md:w-auto" 
                  disabled={isSaving || !name.trim() || (name.trim() === (initialData.name || authUser?.name || "") && bio.trim() === (initialData.bio || authUser?.bio || "") && skills === (initialData.skills?.join(", ") || authUser?.skills?.join(", ") || "") && portfolioUrls === (initialData.portfolioUrls?.join(", ") || "") && experienceLevel === (initialData.experienceLevel || ''))}
                >
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
            <CardDescription>Manage other account preferences and actions.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Options like password changes and notification preferences will be available here in the future.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Request Account Deletion
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be immediately undone. Requesting account deletion will notify an administrator to process your request. Your account and associated data will be scheduled for removal.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleRequestAccountDeletion} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                    Yes, Request Deletion
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    </ProtectedPage>
  );
}
