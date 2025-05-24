
"use client";

import { ProtectedPage } from "@/components/ProtectedPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreditCard, PlusCircle, DollarSign, Loader2, Info, MessageSquare } from "lucide-react"; // Added Info and MessageSquare
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";

// Mock data for invoices and payment methods removed

export default function BillingPage() {
  const { user, isLoading: authLoading } = useAuth();

  if (authLoading || (!user && !authLoading)) {
    return (
      <ProtectedPage>
        <div className="container mx-auto p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
          <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading billing information...</p>
        </div>
      </ProtectedPage>
    );
  }

  const currentPlan = user?.currentPlan || "Free Tier";
  const planPrice = user?.planPrice || "$0/month";
  const planDescription = currentPlan === "Pro Plan" 
    ? "Includes AI matchmaking, unlimited project posts, and priority support."
    : "Basic access to post projects and find developers.";


  return (
    <ProtectedPage>
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight flex items-center"><DollarSign className="mr-3 h-8 w-8 text-primary" />Billing & Payments</h1>
          <p className="text-muted-foreground">Manage your subscription and view invoice history. For changes or inquiries, please use our live chat support.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Current Plan / Subscription */}
          <Card className="lg:col-span-1 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">Current Plan</CardTitle>
              <CardDescription>Your CodeCrafter subscription details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-lg">{currentPlan}</span>
                <Badge variant="default">{planPrice}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {planDescription}
              </p>
              <Image src="https://placehold.co/300x150.png" alt="Subscription plan illustration" data-ai-hint="subscription service" width={300} height={150} className="rounded-md mt-2 w-full h-auto object-cover" />
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" disabled>Manage Subscription (Coming Soon)</Button>
            </CardFooter>
          </Card>

          {/* Payment Methods */}
          <Card className="lg:col-span-2 shadow-lg">
            <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <CardTitle className="text-xl">Payment Methods</CardTitle>
                <CardDescription>Manage your saved payment options.</CardDescription>
              </div>
              <Button variant="default" size="sm" className="w-full sm:w-auto mt-2 sm:mt-0" disabled>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Method (Coming Soon)
              </Button>
            </CardHeader>
            <CardContent>
              <div className="p-6 text-center border-2 border-dashed rounded-lg">
                <Info className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                <h3 className="text-lg font-medium mb-1">Under Development</h3>
                <p className="text-sm text-muted-foreground">
                  The ability to add and manage payment methods directly is coming soon. 
                  For any urgent billing updates, please contact our support team via live chat.
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4" 
                  onClick={() => (window as any).Tawk_API?.maximize?.()} // Opens Tawk.to chat if available
                >
                  <MessageSquare className="mr-2 h-4 w-4" /> Contact Support
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoice History */}
        <Card className="mt-8 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl">Invoice History</CardTitle>
            <CardDescription>Review your past payments and download invoices.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="p-8 text-center border-2 border-dashed rounded-lg">
                <Info className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                <h3 className="text-lg font-medium mb-1">Coming Soon</h3>
                <p className="text-sm text-muted-foreground">
                  Your invoice history will be accessible here once our full billing system is integrated.
                  If you need copies of past invoices, please reach out to our support team via live chat.
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => (window as any).Tawk_API?.maximize?.()} // Opens Tawk.to chat if available
                >
                   <MessageSquare className="mr-2 h-4 w-4" /> Contact Support
                </Button>
              </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedPage>
  );
}
