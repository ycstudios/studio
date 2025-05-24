
"use client";

import { ProtectedPage } from "@/components/ProtectedPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Copy, Gift, Share2, Users } from "lucide-react";
import Image from "next/image";

export default function ReferralsPage() {
  const { toast } = useToast();
  const referralLink = "https://codecrafter.example.com/signup?ref=USER123"; // Mock referral link
  const referralCode = "USER123";

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "Copied!", description: `${text} copied to clipboard.` });
    }).catch(err => {
      toast({ title: "Failed to copy", description: "Could not copy text.", variant: "destructive" });
      console.error('Failed to copy text: ', err);
    });
  };

  return (
    <ProtectedPage>
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <header className="mb-8 text-center">
          <Gift className="mx-auto h-16 w-16 text-primary mb-4" />
          <h1 className="text-4xl font-bold tracking-tight">Refer & Earn</h1>
          <p className="text-xl text-muted-foreground mt-2">Invite clients or developers to CodeCrafter and earn commissions!</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <Card className="shadow-xl transform hover:scale-105 transition-transform duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">Your Referral Link</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">Share this unique link with your network. When someone signs up using your link, you get rewarded.</p>
              <div className="flex items-center space-x-2 p-3 border rounded-lg bg-muted">
                <input type="text" value={referralLink} readOnly className="flex-grow bg-transparent outline-none text-sm break-all" />
                <Button variant="ghost" size="icon" onClick={() => copyToClipboard(referralLink)} className="flex-shrink-0">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button className="w-full" onClick={() => copyToClipboard(referralLink)}>
                <Copy className="mr-2 h-4 w-4" /> Copy Link
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-xl transform hover:scale-105 transition-transform duration-300">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-accent/10 rounded-full">
                 <Share2 className="h-6 w-6 text-accent" />
                </div>
                <CardTitle className="text-2xl">Share Your Code</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">Alternatively, they can enter your referral code during signup.</p>
               <div className="flex items-center space-x-2 p-3 border rounded-lg bg-muted">
                <input type="text" value={referralCode} readOnly className="flex-grow bg-transparent outline-none text-sm font-semibold" />
                <Button variant="ghost" size="icon" onClick={() => copyToClipboard(referralCode)} className="flex-shrink-0">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" className="w-full" onClick={() => copyToClipboard(referralCode)}>
                <Copy className="mr-2 h-4 w-4" /> Copy Code
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">How It Works</CardTitle>
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-6 text-center">
            <div className="space-y-2 p-4 border rounded-lg bg-background hover:shadow-md transition-shadow">
              <div className="p-3 bg-secondary rounded-full inline-block mb-2">
                <Share2 className="h-8 w-8 text-secondary-foreground" />
              </div>
              <h3 className="text-lg font-semibold">1. Share</h3>
              <p className="text-sm text-muted-foreground">Share your unique referral link or code.</p>
            </div>
            <div className="space-y-2 p-4 border rounded-lg bg-background hover:shadow-md transition-shadow">
              <div className="p-3 bg-secondary rounded-full inline-block mb-2">
                <Users className="h-8 w-8 text-secondary-foreground" />
              </div>
              <h3 className="text-lg font-semibold">2. Sign Up</h3>
              <p className="text-sm text-muted-foreground">Your friends sign up using your link/code.</p>
            </div>
            <div className="space-y-2 p-4 border rounded-lg bg-background hover:shadow-md transition-shadow">
               <div className="p-3 bg-secondary rounded-full inline-block mb-2">
                <Gift className="h-8 w-8 text-secondary-foreground" />
              </div>
              <h3 className="text-lg font-semibold">3. Earn</h3>
              <p className="text-sm text-muted-foreground">You earn a commission for successful referrals!</p>
            </div>
          </CardContent>
        </Card>
        
        <div className="mt-12 text-center">
            <Image src="https://placehold.co/800x300.png" alt="Referral Banner" data-ai-hint="people network" width={800} height={300} className="rounded-lg mx-auto shadow-md w-full h-auto max-w-[800px]" />
        </div>
      </div>
    </ProtectedPage>
  );
}
