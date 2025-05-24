
"use client";

import { ProtectedPage } from "@/components/ProtectedPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Copy, Gift, Share2, Users, Info, Loader2, AlertTriangle } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import React, { useEffect, useState } from "react"; 
import { getReferredClients } from "@/lib/firebaseService";
import type { User as UserType } from "@/types";
import { format } from 'date-fns';

export default function ReferralsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [referralLink, setReferralLink] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [referredClients, setReferredClients] = useState<UserType[]>([]);
  const [isLoadingReferred, setIsLoadingReferred] = useState(false);
  const [fetchReferredError, setFetchReferredError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.referralCode) {
      setReferralCode(user.referralCode);
      if (typeof window !== 'undefined') {
        setReferralLink(`${window.location.origin}/signup?ref=${user.referralCode}`);
      }

      // Fetch referred clients
      const fetchClients = async () => {
        setIsLoadingReferred(true);
        setFetchReferredError(null);
        try {
          const clients = await getReferredClients(user.referralCode!);
          setReferredClients(clients);
        } catch (e) {
          console.error("Failed to fetch referred clients:", e);
          const errorMsg = e instanceof Error ? e.message : "Could not retrieve referred clients list.";
          setFetchReferredError(errorMsg);
          toast({
            title: "Error Fetching Referred Clients",
            description: errorMsg,
            variant: "destructive",
          });
        } finally {
          setIsLoadingReferred(false);
        }
      };
      fetchClients();

    } else if (user && !user.referralCode && !authLoading) {
       setReferralCode("Not yet available");
       setReferralLink("Not yet available");
    }
  }, [user, authLoading, toast]);

  const copyToClipboard = (text: string) => {
    if (text === "Not yet available" || !text || text === "Loading...") {
      toast({ title: "Info", description: "Referral code/link is not available to copy yet.", variant: "default" });
      return;
    }
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: "Copied!", description: `${text} copied to clipboard.` });
    }).catch(err => {
      toast({ title: "Failed to copy", description: "Could not copy text.", variant: "destructive" });
      console.error('Failed to copy text: ', err);
    });
  };

  if (authLoading || (!user && !authLoading)) {
    return (
      <ProtectedPage>
        <div className="container mx-auto p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
          <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading referral information...</p>
        </div>
      </ProtectedPage>
    );
  }


  return (
    <ProtectedPage>
      <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <header className="mb-8 text-center">
          <Gift className="mx-auto h-16 w-16 text-primary mb-4" />
          <h1 className="text-4xl font-bold tracking-tight">Refer & Earn</h1>
          <p className="text-xl text-muted-foreground mt-2">Invite clients to CodeCrafter and earn commissions!</p>
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
              <p className="text-muted-foreground">Share this unique link with your network. When someone signs up as a client using your link, you get rewarded.</p>
              <div className="flex items-center space-x-2 p-3 border rounded-lg bg-muted">
                <input type="text" value={referralLink || "Loading..."} readOnly className="flex-grow bg-transparent outline-none text-sm break-all" />
                <Button variant="ghost" size="icon" onClick={() => copyToClipboard(referralLink)} className="flex-shrink-0" disabled={!referralLink || referralLink === "Loading..." || referralLink === "Not yet available"}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button className="w-full" onClick={() => copyToClipboard(referralLink)} disabled={!referralLink || referralLink === "Loading..." || referralLink === "Not yet available"}>
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
              <p className="text-muted-foreground">Alternatively, they can enter your referral code during signup. You'll earn for new clients.</p>
               <div className="flex items-center space-x-2 p-3 border rounded-lg bg-muted">
                <input type="text" value={referralCode || "Loading..."} readOnly className="flex-grow bg-transparent outline-none text-sm font-semibold" />
                <Button variant="ghost" size="icon" onClick={() => copyToClipboard(referralCode)} className="flex-shrink-0" disabled={!referralCode || referralCode === "Loading..." || referralCode === "Not yet available"}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" className="w-full" onClick={() => copyToClipboard(referralCode)} disabled={!referralCode || referralCode === "Loading..." || referralCode === "Not yet available"}>
                <Copy className="mr-2 h-4 w-4" /> Copy Code
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">How It Works</CardTitle>
            <CardDescription>Refer new clients to CodeCrafter and get rewarded for their first project!</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-6 text-center">
            <div className="space-y-2 p-4 border rounded-lg bg-background hover:shadow-md transition-shadow">
              <div className="p-3 bg-secondary rounded-full inline-block mb-2">
                <Share2 className="h-8 w-8 text-secondary-foreground" />
              </div>
              <h3 className="text-lg font-semibold">1. Share</h3>
              <p className="text-sm text-muted-foreground">Share your unique referral link or code with potential clients.</p>
            </div>
            <div className="space-y-2 p-4 border rounded-lg bg-background hover:shadow-md transition-shadow">
              <div className="p-3 bg-secondary rounded-full inline-block mb-2">
                <Users className="h-8 w-8 text-secondary-foreground" />
              </div>
              <h3 className="text-lg font-semibold">2. Client Signs Up</h3>
              <p className="text-sm text-muted-foreground">Your referred clients sign up using your link/code.</p>
            </div>
            <div className="space-y-2 p-4 border rounded-lg bg-background hover:shadow-md transition-shadow">
               <div className="p-3 bg-secondary rounded-full inline-block mb-2">
                <Gift className="h-8 w-8 text-secondary-foreground" />
              </div>
              <h3 className="text-lg font-semibold">3. Earn</h3>
              <p className="text-sm text-muted-foreground">You earn a commission for each new client who starts their first project! (Details TBD)</p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="mt-8 shadow-lg">
            <CardHeader>
                <CardTitle>Your Referred Clients ({referredClients.length})</CardTitle>
                <CardDescription>Track clients who signed up using your code.</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingReferred ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
                  <p className="text-muted-foreground">Loading your referred clients...</p>
                </div>
              ) : fetchReferredError ? (
                <div className="flex items-center justify-center text-center p-8 border-2 border-dashed border-destructive rounded-lg">
                    <AlertTriangle className="h-8 w-8 text-destructive mr-3" />
                    <p className="text-destructive-foreground">Error: {fetchReferredError}</p>
                </div>
              ) : referredClients.length === 0 ? (
                <div className="flex items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
                    <Info className="h-8 w-8 text-muted-foreground mr-3" />
                    <p className="text-muted-foreground">
                        You haven't referred any clients yet, or they haven't signed up. Share your code to start earning!
                    </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Date Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {referredClients.map(client => (
                        <TableRow key={client.id}>
                          <TableCell className="font-medium">{client.name}</TableCell>
                          <TableCell>{client.email}</TableCell>
                          <TableCell>
                            {client.createdAt ? format(new Date(client.createdAt as any), 'PPP') : 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
        </Card>

        <div className="mt-12 text-center">
            <Image src="https://placehold.co/800x300.png" alt="Referral Banner" data-ai-hint="people network" width={800} height={300} className="rounded-lg mx-auto shadow-md w-full h-auto max-w-[800px]" />
        </div>
      </div>
    </ProtectedPage>
  );
}
