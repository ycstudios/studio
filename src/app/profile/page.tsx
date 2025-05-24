
"use client";

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
import { Edit3, Save, UserCircle2, Briefcase, Palette } from "lucide-react";
import { useState } from "react";

export default function ProfilePage() {
  const { user, login } = useAuth(); // Using login to update user context after edit
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  
  // Form state - In a real app, use react-hook-form
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || ""); // Email usually not editable
  const [bio, setBio] = useState(user?.bio || "Experienced professional looking for exciting projects."); // Add bio to User type if needed
  const [skills, setSkills] = useState(user?.skills?.join(", ") || "React, Node.js, TypeScript"); // Add skills to User type

  const handleEditToggle = () => setIsEditing(!isEditing);

  const handleSaveChanges = () => {
    if (!user) return;
    // Mock update
    const updatedUser = { 
      ...user, 
      name, 
      bio, 
      skills: skills.split(",").map(s => s.trim()) 
    };
    login(updatedUser); // Update context
    setIsEditing(false);
    toast({ title: "Profile Updated", description: "Your changes have been saved." });
  };
  
  const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`;
    }
    return name.substring(0, 2).toUpperCase();
  };


  if (!user) return null; // Should be handled by ProtectedPage, but good practice

  return (
    <ProtectedPage>
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <header className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
            <p className="text-muted-foreground">Manage your account settings and public profile.</p>
          </div>
          <Button onClick={handleEditToggle} variant={isEditing ? "secondary" : "default"} className="w-full sm:w-auto">
            {isEditing ? <Save className="mr-2 h-4 w-4" /> : <Edit3 className="mr-2 h-4 w-4" />}
            {isEditing ? "Save Changes" : "Edit Profile"}
          </Button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Card */}
          <Card className="lg:col-span-1 shadow-lg">
            <CardHeader className="items-center text-center">
               <Avatar className="h-24 w-24 mb-4 ring-2 ring-primary ring-offset-2">
                <AvatarImage src={user.avatarUrl || `https://placehold.co/150x150.png`} alt={user.name} data-ai-hint="profile picture" />
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
              {isEditing && (
                <Button variant="outline" size="sm" className="mt-4">
                  <Palette className="mr-2 h-4 w-4" /> Change Avatar
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Profile Details Form/Display */}
          <Card className="lg:col-span-2 shadow-lg">
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
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                ) : (
                  <p className="text-lg font-medium p-2 border rounded-md bg-muted/30">{name}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="email">Email Address</Label>
                 <p className="text-lg p-2 border rounded-md bg-muted/30 text-muted-foreground">{email} (Not editable)</p>
              </div>

              <div>
                <Label htmlFor="bio">Bio</Label>
                {isEditing ? (
                  <Textarea id="bio" placeholder="Tell us about yourself..." className="min-h-[100px]" value={bio} onChange={(e) => setBio(e.target.value)} />
                ) : (
                  <p className="text-sm p-2 border rounded-md bg-muted/30 min-h-[60px]">{bio || "No bio provided."}</p>
                )}
              </div>

              {user.role === "developer" && (
                 <div>
                  <Label htmlFor="skills">Skills</Label>
                  {isEditing ? (
                    <Input id="skills" placeholder="e.g., JavaScript, React, Figma" value={skills} onChange={(e) => setSkills(e.target.value)} />
                  ) : (
                    <div className="flex flex-wrap gap-2 p-2 border rounded-md bg-muted/30 min-h-[40px]">
                      {skills.split(",").map(s => s.trim()).filter(s => s).map((skill, index) => (
                        <span key={index} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md">{skill}</span>
                      ))}
                      {!skills && <span className="text-muted-foreground text-sm">No skills listed.</span>}
                    </div>
                  )}
                  {isEditing && <p className="text-xs text-muted-foreground mt-1">Enter skills separated by commas.</p>}
                </div>
              )}
              
              {isEditing && (
                <Button onClick={handleSaveChanges} className="w-full md:w-auto">
                  <Save className="mr-2 h-4 w-4" /> Save All Changes
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Placeholder for other sections like Password Change, Notifications, etc. */}
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
