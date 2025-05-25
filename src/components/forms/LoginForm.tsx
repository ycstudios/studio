
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
import { getUserByEmail } from "@/lib/firebaseService";
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

    try {
      if (emailLowerCase === "admin@example.com") {
        let adminToLogin: User | null = null;
        const userFromDb = await getUserByEmail(emailLowerCase);

        if (userFromDb && userFromDb.role === 'admin') {
          adminToLogin = userFromDb;
          toast({
            title: "Admin Login Successful",
            description: `Welcome back, ${adminToLogin.name}! (from Firestore)`,
          });
        } else {
          // Fallback to mock admin if not found in DB or not an admin
          adminToLogin = {
            id: "admin_user_mock_id_" + Date.now(), // Slightly more unique mock ID
            name: "Admin User (Default)",
            email: emailLowerCase,
            role: "admin",
            avatarUrl: `https://ui-avatars.com/api/?name=A&background=random&size=100`,
            bio: "Default Administrator Profile",
            currentPlan: "Admin Plan",
            planPrice: "N/A",
            isFlagged: false,
            accountStatus: "active",
            referralCode: "ADMINCODEFALLBACK",
          };
          toast({
            title: "Admin Login Successful",
            description: `Welcome back, Admin! (using default profile)`,
          });
        }
        login(adminToLogin);
        router.push("/admin");
      } else {
        // For other users, try to fetch from Firestore by email
        const userFromDb = await getUserByEmail(emailLowerCase);

        if (userFromDb) {
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
          router.push(userFromDb.role === "admin" ? "/admin" : "/dashboard"); // Should ideally not happen if admin email is hardcoded above
        } else {
          toast({
            title: "Login Failed",
            description: "User not found or invalid credentials. Please check your email and password, or sign up if you don't have an account.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
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
