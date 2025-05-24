
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea"; // Added
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import type { UserRole } from "@/config/site";
import { addUser } from "@/lib/firebaseService"; 
import type { User } from "@/types";
import { Loader2 } from "lucide-react";
import { useState, useEffect } from "react"; // Added useEffect

const experienceLevels: User["experienceLevel"][] = ['', 'Entry', 'Junior', 'Mid-level', 'Senior', 'Lead', 'Principal'];

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }).max(50, {message: "Name must be 50 characters or less."}),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  confirmPassword: z.string(),
  role: z.enum(["client", "developer"], { required_error: "Please select a role." }),
  referralCode: z.string().max(50, { message: "Referral code too long."}).optional(),
  // Developer specific fields - made optional in Zod as they are conditionally required by UI
  skills: z.string().optional(),
  experienceLevel: z.string().optional(), // Zod treats enum values as strings here
  portfolioUrls: z.string().optional(),
  resumeFileUrl: z.string().url({ message: "Please enter a valid URL for your resume." }).optional().or(z.literal('')),
  resumeFileName: z.string().optional(),
  pastProjects: z.string().optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine(data => { // Conditional validation for developer fields
  if (data.role === "developer") {
    return !!data.skills && data.skills.trim().length > 0;
  }
  return true;
}, {
  message: "Skills are required for developers.",
  path: ["skills"],
}).refine(data => {
  if (data.role === "developer") {
    return !!data.experienceLevel && data.experienceLevel !== '';
  }
  return true;
}, {
  message: "Experience level is required for developers.",
  path: ["experienceLevel"],
});


export function SignupForm() {
  const { login } = useAuth(); 
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | undefined>(undefined);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: undefined,
      referralCode: "",
      skills: "",
      experienceLevel: "",
      portfolioUrls: "",
      resumeFileUrl: "",
      resumeFileName: "",
      pastProjects: "",
    },
  });

  const watchedRole = form.watch("role");

  useEffect(() => {
    setSelectedRole(watchedRole as UserRole | undefined);
  }, [watchedRole]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    
    const skillsArray = values.role === 'developer' && values.skills ? values.skills.split(",").map(s => s.trim()).filter(s => s.length > 0) : [];
    const portfolioUrlsArray = values.role === 'developer' && values.portfolioUrls ? values.portfolioUrls.split(",").map(url => url.trim()).filter(url => url.length > 0 && (url.startsWith('http://') || url.startsWith('https://'))) : [];

    const newUserOmitIdAndGeneratedFields: Omit<User, 'id' | 'createdAt' | 'referralCode' | 'currentPlan' | 'planPrice' | 'isFlagged' | 'accountStatus' | 'avatarUrl' | 'bio'> & {referredByCode?: string} = {
      name: values.name,
      email: values.email,
      role: values.role as UserRole,
      referredByCode: values.referralCode?.trim() || undefined,
      // Add developer specific fields if role is developer
      ...(values.role === 'developer' && {
        skills: skillsArray,
        experienceLevel: values.experienceLevel as User["experienceLevel"] || '',
        portfolioUrls: portfolioUrlsArray,
        resumeFileUrl: values.resumeFileUrl?.trim() || undefined,
        resumeFileName: values.resumeFileName?.trim() || undefined,
        pastProjects: values.pastProjects?.trim() || undefined,
      })
    };

    try {
      const savedUser = await addUser(newUserOmitIdAndGeneratedFields); 
      
      login(savedUser); 

      toast({
        title: "Signup Successful!",
        description: `Welcome to CodeCrafter, ${savedUser.name}! Your account has been created. ${savedUser.role === 'developer' ? 'It is now pending admin approval.' : ''}`,
      });
      router.push("/dashboard");

    } catch (error) {
      console.error("Signup error:", error);
      const errorMsg = error instanceof Error ? error.message : "Could not create account. Please try again."
      toast({
        title: "Signup Failed",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-lg shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl">Create a CodeCrafter Account</CardTitle>
        <CardDescription>Join as a client or developer. Fill in the details below.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="•••••••• (min. 6 characters)" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>I am a...</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedRole(value as UserRole);
                    }} 
                    defaultValue={field.value} 
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="client">Client (Looking to hire)</SelectItem>
                      <SelectItem value="developer">Developer (Looking for projects)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedRole === "developer" && (
              <>
                <FormField
                  control={form.control}
                  name="skills"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Skills</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., React, Node.js, Python, Figma" {...field} disabled={isSubmitting}/>
                      </FormControl>
                      <FormDescription>Comma-separated list of your technical skills.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="experienceLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Experience Level</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your experience level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {experienceLevels.filter(level => level !== '').map(level => ( // Filter out empty string for placeholder
                            <SelectItem key={level} value={level!}>{level}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="portfolioUrls"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Portfolio URLs (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., https://github.com/yourprofile, https://yourproject.com" {...field} disabled={isSubmitting}/>
                      </FormControl>
                      <FormDescription>Comma-separated links to your GitHub, projects, or online portfolio.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="resumeFileUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Resume URL (Optional)</FormLabel>
                      <FormControl>
                        <Input type="url" placeholder="https://link-to-your-resume.pdf" {...field} disabled={isSubmitting}/>
                      </FormControl>
                      <FormDescription>Link to your resume (e.g., Google Drive, Dropbox, personal site).</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={form.control}
                  name="resumeFileName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Resume File Name (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., JohnDoe_Resume.pdf" {...field} disabled={isSubmitting}/>
                      </FormControl>
                      <FormDescription>A display name for your resume link.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="pastProjects"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Past Project Highlights (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Briefly describe 1-2 key projects you've worked on, highlighting your role and impact." className="min-h-[100px]" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

             <FormField
              control={form.control}
              name="referralCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Referral Code (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter referral code if you have one" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormDescription>
                    If someone referred you, enter their code here.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? "Creating Account..." : "Create Account"}
            </Button>
          </form>
        </Form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
