"use client";

import { ProtectedPage } from "@/components/ProtectedPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Download, PlusCircle, DollarSign } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

// Mock data
const paymentMethods = [
  { id: "pm_1", type: "Visa", last4: "4242", expiry: "12/25", dataAiHint: "credit card" },
  { id: "pm_2", type: "Mastercard", last4: "5555", expiry: "06/27", dataAiHint: "payment method" },
];

const invoices = [
  { id: "inv_1", date: "2023-10-01", amount: 50.00, status: "Paid", project: "Logo Design", dataAiHint: "invoice document" },
  { id: "inv_2", date: "2023-11-15", amount: 250.00, status: "Pending", project: "Website Development - Phase 1", dataAiHint: "financial report" },
  { id: "inv_3", date: "2023-12-05", amount: 75.00, status: "Paid", project: "Consultation Call", dataAiHint: "business meeting" },
];

export default function BillingPage() {
  return (
    <ProtectedPage>
      <div className="container mx-auto p-4 md:p-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight flex items-center"><DollarSign className="mr-3 h-8 w-8 text-primary" />Billing & Payments</h1>
          <p className="text-muted-foreground">Manage your payment methods, subscriptions, and view your invoice history.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Current Plan / Subscription */}
          <Card className="lg:col-span-1 shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl">Current Plan</CardTitle>
              <CardDescription>Your DevConnect subscription details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-lg">Pro Plan</span>
                <Badge variant="default">$29/month</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Includes AI matchmaking, unlimited project posts, and priority support.
              </p>
              <Image src="https://placehold.co/300x150.png" alt="Subscription plan" data-ai-hint="subscription service" width={300} height={150} className="rounded-md mt-2" />
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">Manage Subscription (Stripe Placeholder)</Button>
            </CardFooter>
          </Card>

          {/* Payment Methods */}
          <Card className="lg:col-span-2 shadow-lg">
            <CardHeader className="flex flex-row justify-between items-center">
              <div>
                <CardTitle className="text-xl">Payment Methods</CardTitle>
                <CardDescription>Your saved payment options.</CardDescription>
              </div>
              <Button variant="default" size="sm">
                <PlusCircle className="mr-2 h-4 w-4" /> Add Method (Stripe Placeholder)
              </Button>
            </CardHeader>
            <CardContent>
              {paymentMethods.length > 0 ? (
                <ul className="space-y-3">
                  {paymentMethods.map(method => (
                    <li key={method.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-6 w-6 text-primary" />
                        <div>
                          <span className="font-medium">{method.type} ending in {method.last4}</span>
                          <p className="text-sm text-muted-foreground">Expires {method.expiry}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">Edit</Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-center py-4">No payment methods saved.</p>
              )}
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map(invoice => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.id.substring(0,6)}...</TableCell>
                    <TableCell>{invoice.date}</TableCell>
                    <TableCell>{invoice.project}</TableCell>
                    <TableCell>${invoice.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant={invoice.status === "Paid" ? "default" : "secondary"} className={invoice.status === "Paid" ? "bg-green-500/20 text-green-700" : "bg-yellow-500/20 text-yellow-700"}>
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" /> Download
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {invoices.length === 0 && (
              <p className="text-muted-foreground text-center py-8">No invoices found.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedPage>
  );
}
