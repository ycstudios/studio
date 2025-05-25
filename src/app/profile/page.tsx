
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
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Edit3, Save, UserCircle2, Briefcase, Loader2, AlertTriangle, Link as LinkIcon, Trash2, DollarSign } from "lucide-react";
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
import { deleteField } from "firebase/firestore";

const experienceLevels: User["experienceLevel"][] = ['', 'Entry', 'Junior', 'Mid-level', 'Senior', 'Lead', 'Principal'];

export default function ProfilePage() {
  const { user: authUser, login: updateAuthContextUser, isLoading: authLoading, refreshUser } = useAuth();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Form fields states
  const [name, setName] = useState("");
  const [email, setEmail] = useState(""); // Display only
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState(""); // Comma-separated string for input
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState("");
  const [newAvatarUrlInput, setNewAvatarUrlInput] = useState("");
  const [portfolioUrls, setPortfolioUrls] = useState(""); // Comma-separated string for input
  const [experienceLevel, setExperienceLevel] = useState<User["experienceLevel"]>('');
  const [hourlyRate, setHourlyRate] = useState<string>(""); // String for input, parsed to number
  const [resumeFileUrl, setResumeFileUrl] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [pastProjects, setPastProjects] = useState("");

  // Store initial fetched data to compare for changes and revert on cancel
  const [initialData, setInitialData] = useState<Partial<User>>({});

  const getInitials = useCallback((nameStr?: string) => {
    if (!nameStr) return "?";
    const names = nameStr.split(' ');
    if (names.length > 1 && names[0] && names[names.length - 1]) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return nameStr.substring(0, 2).toUpperCase();
  }, []);
  
  const defaultAvatarPlaceholder = useCallback((nameForInitials?: string) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(getInitials(nameForInitials))}&background=random&size=100`;
  }, [getInitials]);


  const populateFormFields = useCallback((userData: User | Partial<User>) => {
    setName(userData.name || "");
    setEmail(userData.email || ""); 
    setBio(userData.bio || (userData.role === 'developer' ? "Skilled developer ready for new challenges." : "Client looking for expert developers."));
    setSkills(userData.skills?.join(", ") || "");
    const avatarToDisplay = userData.avatarUrl || defaultAvatarPlaceholder(userData.name);
    setCurrentAvatarUrl(avatarToDisplay);
    setNewAvatarUrlInput(userData.avatarUrl && userData.avatarUrl !== defaultAvatarPlaceholder(userData.name) ? userData.avatarUrl : "");
    setPortfolioUrls(userData.portfolioUrls?.join(", ") || "");
    setExperienceLevel(userData.experienceLevel || '');
    setHourlyRate(userData.hourlyRate?.toString() || "");
    setResumeFileUrl(userData.resumeFileUrl || "");
    setResumeFileName(userData.resumeFileName || "");
    setPastProjects(userData.pastProjects || "");
  }, [defaultAvatarPlaceholder]);

  const fetchUserData = useCallback(async () => {
    if (!authUser?.id) return;
    setIsLoadingProfile(true);
    setFetchError(null);
    try {
      const fetchedUser = await getUserById(authUser.id);
      if (fetchedUser) {
        setInitialData(fetchedUser); 
        populateFormFields(fetchedUser); 
      } else {
        setFetchError("Could not load your profile data. It might be missing or an error occurred.");
      }
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Failed to load profile data.";
      setFetchError(errorMsg);
    } finally {
      setIsLoadingProfile(false);
    }
  }, [authUser?.id, populateFormFields]);

  useEffect(() => {
    if (authUser?.id && !authLoading) {
      fetchUserData();
    } else if (!authLoading && !authUser) {
      setIsLoadingProfile(false);
      setFetchError("User not authenticated. Please log in to view your profile.");
    }
  }, [authUser, authLoading, fetchUserData]);

  const handleEditToggle = () => {
    if (isEditing) {
      populateFormFields(initialData);
    } else {
      setNewAvatarUrlInput(initialData.avatarUrl && initialData.avatarUrl !== defaultAvatarPlaceholder(initialData.name) ? initialData.avatarUrl : "");
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
    setFetchError(null); 

    let finalAvatarUrl = newAvatarUrlInput.trim();
    if (finalAvatarUrl && !finalAvatarUrl.startsWith('http://') && !finalAvatarUrl.startsWith('https://')) {
      toast({ title: "Invalid Avatar URL", description: "Please enter a valid URL (http:// or https://) or leave it empty for default.", variant: "destructive" });
      setIsSaving(false);
      return;
    }
    if (!finalAvatarUrl) { 
      finalAvatarUrl = defaultAvatarPlaceholder(name.trim());
    }

    const skillsArray = authUser.role === 'developer' ? skills.split(",").map(s => s.trim()).filter(s => s.length > 0) : undefined;
    const portfolioUrlsArray = authUser.role === 'developer' ? portfolioUrls.split(",").map(url => url.trim()).filter(url => url.length > 0 && (url.startsWith('http://') || url.startsWith('https://'))) : undefined;
    
    const hourlyRateNum = (hourlyRate.trim() === '' || isNaN(parseFloat(hourlyRate))) ? undefined : parseFloat(hourlyRate);
    if (authUser.role === 'developer' && hourlyRate.trim() !== '' && (hourlyRateNum === undefined || hourlyRateNum < 0)) {
        toast({ title: "Invalid Hourly Rate", description: "Hourly rate must be a positive number or empty.", variant: "destructive"});
        setIsSaving(false);
        return;
    }
    
    const trimmedResumeUrl = resumeFileUrl.trim();
    if (authUser.role === 'developer' && trimmedResumeUrl && !trimmedResumeUrl.startsWith('http://') && !trimmedResumeUrl.startsWith('https://')) {
        toast({ title: "Invalid Resume URL", description: "Resume URL must be a valid URL (http:// or https://) or empty.", variant: "destructive" });
        setIsSaving(false);
        return;
    }

    const trimmedBio = bio.trim();
    const trimmedResumeFileName = resumeFileName.trim();
    const trimmedPastProjects = pastProjects.trim();

    const updatedData: Partial<Omit<User, 'id' | 'createdAt' | 'email' | 'role'>> = {
      name: name.trim(),
      bio: trimmedBio ? trimmedBio : deleteField() as any,
      avatarUrl: (finalAvatarUrl && finalAvatarUrl !== defaultAvatarPlaceholder(name.trim())) ? finalAvatarUrl : deleteField() as any,
    };

    if (authUser.role === 'developer') {
      updatedData.skills = skillsArray && skillsArray.length > 0 ? skillsArray : deleteField() as any;
      updatedData.portfolioUrls = portfolioUrlsArray && portfolioUrlsArray.length > 0 ? portfolioUrlsArray : deleteField() as any;
      updatedData.experienceLevel = experienceLevel || ''; 
      updatedData.hourlyRate = hourlyRateNum !== undefined ? hourlyRateNum : deleteField() as any;
      updatedData.resumeFileUrl = trimmedResumeUrl ? trimmedResumeUrl : deleteField() as any;
      updatedData.resumeFileName = trimmedResumeFileName ? trimmedResumeFileName : deleteField() as any;
      updatedData.pastProjects = trimmedPastProjects ? trimmedPastProjects : deleteField() as any;
    } else { 
      updatedData.skills = deleteField() as any;
      updatedData.portfolioUrls = deleteField() as any;
      updatedData.experienceLevel = deleteField() as any;
      updatedData.hourlyRate = deleteField() as any;
      updatedData.resumeFileUrl = deleteField() as any;
      updatedData.resumeFileName = deleteField() as any;
      updatedData.pastProjects = deleteField() as any;
    }

    try {
      await updateUser(authUser.id, updatedData);
      
      const refreshedUserData = await getUserById(authUser.id); // Re-fetch to get the most current state including server-generated fields
      if (refreshedUserData) {
        updateAuthContextUser(refreshedUserData);
        setInitialData(refreshedUserData);
        populateFormFields(refreshedUserData);
      }
      
      setIsEditing(false);
      toast({ title: "Profile Updated", description: "Your changes have been saved." });
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : "Failed to save profile changes.";
      setFetchError(errorMsg); 
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

  if (fetchError && !isEditing) { 
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
  
  if (!authUser) {
     return (
      <ProtectedPage> 
        <div className="container mx-auto p-4 md:p-6 lg:p-8 text-center">
            <p className="text-muted-foreground">User not authenticated.</p>
        </div>
      </ProtectedPage>
    );
  }

  const hasChanges = isEditing && (
    name.trim() !== (initialData.name || "") ||
    (newAvatarUrlInput.trim() || defaultAvatarPlaceholder(name.trim())) !== (initialData.avatarUrl || defaultAvatarPlaceholder(initialData.name)) ||
    bio.trim() !== (initialData.bio || (authUser?.role === 'developer' ? "Skilled developer ready for new challenges." : "Client looking for expert developers.")) ||
    (authUser.role === 'developer' && (
      skills !== (initialData.skills?.join(", ") || "") ||
      portfolioUrls !== (initialData.portfolioUrls?.join(", ") || "") ||
      experienceLevel !== (initialData.experienceLevel || '') ||
      (hourlyRate.trim() === '' ? undefined : parseFloat(hourlyRate)) !== initialData.hourlyRate ||
      resumeFileUrl.trim() !== (initialData.resumeFileUrl || "") ||
      resumeFileName.trim() !== (initialData.resumeFileName || "") ||
      pastProjects.trim() !== (initialData.pastProjects || "")
    ))
  );


  return (
    <ProtectedPage>
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
            <p className="text-muted-foreground">Manage your account settings and public profile information from Firestore.</p>
          </div>
          <Button
            onClick={isEditing ? (hasChanges ? handleSaveChanges : () => setIsEditing(false)) : handleEditToggle}
            variant={isEditing && hasChanges ? "default" : "outline"}
            className="w-full sm:w-auto"
            disabled={isSaving || (isEditing && !name.trim())}
          >
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isEditing && hasChanges ? <Save className="mr-2 h-4 w-4" /> : <Edit3 className="mr-2 h-4 w-4" />)}
            {isSaving ? "Saving..." : (isEditing ? (hasChanges ? "Save Changes" : "Cancel Edit") : "Edit Profile")}
          </Button>
        </header>

        {fetchError && isEditing && ( 
             <Alert variant="destructive" className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Save Error</AlertTitle>
                <AlertDescription>
                {fetchError} Please check your input and try again.
                </AlertDescription>
            </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="md:col-span-1 shadow-lg">
            <CardHeader className="items-center text-center">
               <Avatar className="h-24 w-24 mb-4 ring-2 ring-primary ring-offset-2">
                <AvatarImage src={currentAvatarUrl} alt={name} data-ai-hint="profile avatar" />
                <AvatarFallback>{getInitials(name)}</AvatarFallback>
              </Avatar>
              <CardTitle className="text-2xl">{isEditing ? name : (initialData.name || "Unnamed User")}</CardTitle>
              <CardDescription className="capitalize flex items-center justify-center gap-1">
                {authUser?.role === "client" ? <Briefcase className="h-4 w-4" /> : <UserCircle2 className="h-4 w-4" />}
                {authUser?.role}
              </CardDescription>
              {authUser?.role === "developer" && ((isEditing ? parseFloat(hourlyRate) : initialData.hourlyRate) ?? -1) >= 0 && (
                <p className="text-sm text-primary font-semibold mt-1 flex items-center justify-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  ${(isEditing ? hourlyRate : initialData.hourlyRate?.toString()) || '0'}/hr
                </p>
              )}
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">{email}</p>
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
                  <p className="text-lg font-medium p-2 border rounded-md bg-muted/30 min-h-[40px]">{initialData.name || <span className="italic text-muted-foreground">Not set</span>}</p>
                )}
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                 <p className="text-lg p-2 border rounded-md bg-muted/30 text-muted-foreground min-h-[40px]">{email} (Not editable)</p>
              </div>

              {isEditing && (
                <div>
                  <Label htmlFor="avatarUrl">Avatar URL</Label>
                  <Input
                    id="avatarUrl"
                    placeholder="https://example.com/avatar.png (leave blank for default)"
                    value={newAvatarUrlInput}
                    onChange={(e) => setNewAvatarUrlInput(e.target.value)}
                    disabled={isSaving}
                  />
                   <p className="text-xs text-muted-foreground mt-1">Enter a full URL to an image, or leave blank for a default placeholder.</p>
                </div>
              )}

              <div>
                <Label htmlFor="bio">Bio</Label>
                {isEditing ? (
                  <Textarea id="bio" placeholder="Tell us about yourself..." className="min-h-[100px]" value={bio} onChange={(e) => setBio(e.target.value)} disabled={isSaving} />
                ) : (
                  <p className="text-sm p-3 border rounded-md bg-muted/30 min-h-[60px] whitespace-pre-wrap">{initialData.bio || <span className="italic text-muted-foreground">No bio provided.</span>}</p>
                )}
              </div>

              {authUser?.role === "developer" && (
                <>
                  <div>
                    <Label htmlFor="skills">Skills</Label>
                    {isEditing ? (
                      <Input id="skills" placeholder="e.g., JavaScript, React, Figma" value={skills} onChange={(e) => setSkills(e.target.value)} disabled={isSaving} />
                    ) : (
                       <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted/30 min-h-[40px]">
                        {(initialData.skills?.length ? initialData.skills : ["No skills listed"]).map((skill, index) => (
                          <Badge key={index} variant={skill === "No skills listed" ? "outline" : "secondary"} className={skill === "No skills listed" ? "italic text-muted-foreground" : ""}>{skill}</Badge>
                        ))}
                      </div>
                    )}
                    {isEditing && <p className="text-xs text-muted-foreground mt-1">Enter skills separated by commas.</p>}
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

                  <div>
                    <Label htmlFor="hourlyRate">Hourly Rate ($ USD)</Label>
                    {isEditing ? (
                      <Input id="hourlyRate" type="number" placeholder="e.g., 50" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} disabled={isSaving} min="0" step="1"/>
                    ) : (
                      <p className="text-lg font-medium p-2 border rounded-md bg-muted/30 min-h-[40px]">
                        {initialData.hourlyRate !== undefined ? `$${initialData.hourlyRate}/hr` : <span className="italic text-muted-foreground">Not specified</span>}
                      </p>
                    )}
                     {isEditing && <p className="text-xs text-muted-foreground mt-1">Enter your preferred hourly rate. Leave blank if not applicable.</p>}
                  </div>


                  <div>
                    <Label htmlFor="portfolioUrls">Portfolio URLs</Label>
                    {isEditing ? (
                      <Input id="portfolioUrls" placeholder="e.g., https://github.com/user, https://linkedin.com/in/user" value={portfolioUrls} onChange={(e) => setPortfolioUrls(e.target.value)} disabled={isSaving} />
                    ) : (
                      <div className="p-2 border rounded-md bg-muted/30 min-h-[40px]">
                        {initialData.portfolioUrls?.length ? (
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
                    <Label htmlFor="resumeFileUrl">Resume URL</Label>
                    {isEditing ? (
                      <Input id="resumeFileUrl" type="url" placeholder="https://link-to-your-resume.pdf" value={resumeFileUrl} onChange={(e) => setResumeFileUrl(e.target.value)} disabled={isSaving} />
                    ) : (
                       initialData.resumeFileUrl ? (
                        <a href={initialData.resumeFileUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-lg p-2 border rounded-md bg-muted/30 block min-h-[40px] truncate">
                          {initialData.resumeFileName || initialData.resumeFileUrl}
                        </a>
                      ) : <p className="text-lg p-2 border rounded-md bg-muted/30 min-h-[40px] italic text-muted-foreground">Not provided</p>
                    )}
                     {isEditing && <p className="text-xs text-muted-foreground mt-1">Link to your resume (e.g., Google Drive, Dropbox).</p>}
                  </div>
                  
                  <div>
                    <Label htmlFor="resumeFileName">Resume File Name (Optional display name)</Label>
                    {isEditing ? (
                      <Input id="resumeFileName" placeholder="e.g., My_Resume.pdf" value={resumeFileName} onChange={(e) => setResumeFileName(e.target.value)} disabled={isSaving} />
                    ) : (
                       <p className="text-lg font-medium p-2 border rounded-md bg-muted/30 min-h-[40px]">{initialData.resumeFileName || (initialData.resumeFileUrl ? <span className="italic text-muted-foreground">Using URL as name</span> : <span className="italic text-muted-foreground">Not set</span>)}</p>
                    )}
                     {isEditing && <p className="text-xs text-muted-foreground mt-1">Provide a display name for your resume link.</p>}
                  </div>

                   <div>
                    <Label htmlFor="pastProjects">Past Project Highlights</Label>
                    {isEditing ? (
                      <Textarea id="pastProjects" placeholder="Briefly describe 1-2 key projects..." className="min-h-[100px]" value={pastProjects} onChange={(e) => setPastProjects(e.target.value)} disabled={isSaving} />
                    ) : (
                      <p className="text-sm p-3 border rounded-md bg-muted/30 min-h-[60px] whitespace-pre-wrap">{initialData.pastProjects || <span className="italic text-muted-foreground">No past projects described.</span>}</p>
                    )}
                  </div>
                </>
              )}

              {isEditing && (
                <Button
                  onClick={handleSaveChanges}
                  className="w-full md:w-auto mt-4"
                  disabled={isSaving || !name.trim() || !hasChanges}
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
              Request account deletion below. Password changes and notification preferences will be available here in the future.
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

