
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import type { UserRole } from "@/config/site";
import { getUserByEmail } from "@/lib/firebaseService"; // Import new service
import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { User } from "@/types";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    const emailLowerCase = values.email.toLowerCase();

    // Special case for admin login
    if (emailLowerCase === "admin@example.com") {
      // In a real Firebase Auth scenario, admin would have proper credentials.
      // Here, we're still mocking part of it for the admin role.
      const adminUser: User = {
        id: "admin_user_mock_id", 
        name: "Admin User",
        email: emailLowerCase,
        role: "admin",
        avatarUrl: `https://placehold.co/100x100.png?text=A`,
        // Add other required User fields with default/mock values if needed
        bio: "Administrator",
        currentPlan: "Admin Plan",
        planPrice: "N/A",
        isFlagged: false,
        accountStatus: "active",
        referralCode: "ADMINCODE",
      };
      login(adminUser);
      toast({
        title: "Admin Login Successful",
        description: `Welcome back, Admin!`,
      });
      router.push("/admin");
      setIsSubmitting(false);
      return;
    }

    // For other users, try to fetch from Firestore by email
    try {
      const userFromDb = await getUserByEmail(emailLowerCase);

      if (userFromDb) {
        // MOCK LOGIN: Password is not checked against Firestore in this example.
        // In a real app with Firebase Auth, you'd call Firebase's signInWithEmailAndPassword.
        
        if (userFromDb.accountStatus === 'pending_approval' && userFromDb.role === 'developer') {
          toast({
            title: "Account Pending Approval",
            description: "Your developer account is still awaiting approval from an administrator.",
            variant: "default",
            duration: 7000,
          });
          setIsSubmitting(false);
          return;
        }
        
        if (userFromDb.accountStatus === 'rejected') {
          toast({
            title: "Account Access Denied",
            description: "Your account application was not approved. Please contact support if you believe this is an error.",
            variant: "destructive",
            duration: 7000,
          });
          setIsSubmitting(false);
          return;
        }

         if (userFromDb.accountStatus === 'suspended') {
          toast({
            title: "Account Suspended",
            description: "Your account is currently suspended. Please contact support.",
            variant: "destructive",
            duration: 7000,
          });
          setIsSubmitting(false);
          return;
        }


        login(userFromDb);
        toast({
          title: "Login Successful",
          description: `Welcome back, ${userFromDb.name}!`,
        });
        router.push(userFromDb.role === "admin" ? "/admin" : "/dashboard");
      } else {
        toast({
          title: "Login Failed",
          description: "User not found or invalid credentials. Please check your email and password, or sign up if you don't have an account.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl">Login to CodeCrafter</CardTitle>
        <CardDescription>Enter your credentials to access your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="you@example.com" {...field} disabled={isSubmitting} />
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
                    <Input type="password" placeholder="••••••••" {...field} disabled={isSubmitting} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? "Logging in..." : "Login"}
            </Button>
          </form>
        </Form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

    