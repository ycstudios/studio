
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

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    // This is a mock login. In a real app with Firebase Auth, you'd call Firebase's signInWithEmailAndPassword.
    
    let role: UserRole;
    const emailLowerCase = values.email.toLowerCase();

    if (emailLowerCase === "admin@example.com") {
      role = "admin";
    } else if (emailLowerCase.includes("developer") || emailLowerCase.includes("dev")) { // Added "dev" for flexibility
      role = "developer";
    } else if (emailLowerCase.includes("client")) {
      role = "client";
    } else {
        toast({
            title: "Login Failed",
            description: "Invalid credentials. Use 'client@example.com', 'dev@example.com', or 'admin@example.com' for demo.",
            variant: "destructive",
        });
        return;
    }

    // In a real Firebase Auth scenario, Firebase would provide the user object.
    // Here, we're still mocking part of it.
    login({
      id: Math.random().toString(36).substring(2, 15), // Mock ID generation
      name: values.email.split('@')[0] || "User", 
      email: values.email,
      role: role,
      avatarUrl: `https://placehold.co/100x100.png?text=${(values.email.split('@')[0]?.[0] || 'U').toUpperCase()}`
    });

    toast({
      title: "Login Successful",
      description: `Welcome back, ${values.email.split('@')[0] || "User"}!`,
    });
    
    if (role === "admin") {
      router.push("/admin");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl">Login to CodeCrafter</CardTitle>
        <CardDescription>Enter your credentials to access your account. (Use 'admin@example.com' for admin access)</CardDescription>
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
                    <Input placeholder="you@example.com" {...field} />
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
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full">Login</Button>
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
