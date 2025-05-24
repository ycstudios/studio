
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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Send } from "lucide-react";
import React, { useState } from "react";
import { sendEmail, getQuickServiceRequestAdminNotificationHtml, getQuickServiceRequestClientConfirmationHtml } from "@/lib/emailService";
import type { BudgetRange, UrgencyLevel, QuickServiceRequestData } from "@/types";

const budgetRanges: BudgetRange[] = ['', '$500-$1k', '$1k-$2.5k', '$2.5k-$5k', '$5k-$10k', '$10k+'];
const urgencyLevels: UrgencyLevel[] = ['', 'Low', 'Medium', 'High', 'Critical'];

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }).max(100),
  email: z.string().email({ message: "Please enter a valid email address." }),
  description: z.string().min(30, { message: "Please describe your project needs (min 30 characters)." }).max(5000),
  budget: z.custom<BudgetRange>().optional(),
  urgency: z.custom<UrgencyLevel>().optional(),
});

export function QuickServiceRequestForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      description: "",
      budget: '',
      urgency: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    const adminEmailRecipient = process.env.NEXT_PUBLIC_ADMIN_EMAIL_RECIPIENT || "admin@example.com"; // Fallback if not set

    const formData: QuickServiceRequestData = {
      name: values.name,
      email: values.email,
      description: values.description,
      budget: values.budget || undefined,
      urgency: values.urgency || undefined,
    };

    try {
      // Send notification to admin
      const adminHtmlBody = await getQuickServiceRequestAdminNotificationHtml(formData);
      await sendEmail(
        adminEmailRecipient,
        `New Quick Service Request: ${formData.name}`,
        adminHtmlBody,
        formData.name, // fromName
        formData.email  // replyTo
      );

      // Send confirmation to client
      const clientHtmlBody = await getQuickServiceRequestClientConfirmationHtml(formData);
      await sendEmail(
        formData.email,
        "CodeCrafter: We've Received Your Request!",
        clientHtmlBody
      );

      toast({
        title: "Request Submitted!",
        description: "Thank you! We've received your request and will be in touch shortly.",
      });
      form.reset();
    } catch (error) {
      console.error("Failed to send service request emails:", error);
      toast({
        title: "Submission Error",
        description: error instanceof Error ? error.message : "Could not submit your request. Please try again later or contact us directly.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Ada Lovelace" {...field} disabled={isSubmitting} />
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
              <FormLabel>Your Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="e.g., ada@example.com" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Briefly tell us about your project, what you need, and any key features."
                  className="min-h-[120px]"
                  {...field}
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormDescription>The more details you provide, the better we can assist you.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="budget"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estimated Budget (Optional)</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your budget range" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {budgetRanges.map(range => (
                      <SelectItem key={range} value={range || 'none'}>{range || 'Not Specified'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="urgency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Project Urgency (Optional)</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmitting}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select urgency level" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {urgencyLevels.map(level => (
                      <SelectItem key={level} value={level || 'none'}>{level || 'Not Specified'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button type="submit" className="w-full text-lg py-6" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Send className="mr-2 h-5 w-5" />
          )}
          {isSubmitting ? "Sending Your Request..." : "Send Request & Get Matched"}
        </Button>
      </form>
    </Form>
  );
}
