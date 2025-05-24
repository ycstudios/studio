
// src/lib/emailService.ts
"use server"; // Can be a server module if we imagine it calling a real backend service

import type { User } from "@/types";

// --- Basic HTML Email Templates ---

function getEmailWrapper(title: string, content: string): string {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 20px auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #0A0F1C; color: #FFFFFF; padding: 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">CodeCrafter</h1>
      </div>
      <div style="padding: 20px;">
        <h2 style="color: #007ACC; font-size: 20px;">${title}</h2>
        ${content}
        <p style="margin-top: 30px; font-size: 0.9em; color: #555;">
          Thank you for using CodeCrafter!<br/>
          The CodeCrafter Team
        </p>
      </div>
      <div style="background-color: #f8f8f8; color: #777; padding: 15px; text-align: center; font-size: 0.8em;">
        <p>&copy; ${new Date().getFullYear()} CodeCrafter. All rights reserved.</p>
      </div>
    </div>
  `;
}

export async function getWelcomeEmailTemplate(userName: string, userRole: User['role']): Promise<string> {
  let roleSpecificMessage = "";
  if (userRole === "developer") {
    roleSpecificMessage = "<p>Your developer account is currently pending approval by our team. We'll notify you once it's reviewed. In the meantime, feel free to explore and complete your profile!</p>";
  } else if (userRole === "client") {
    roleSpecificMessage = "<p>You can now start submitting projects and finding talented developers.</p>";
  }

  const content = `
    <p>Hi ${userName},</p>
    <p>Welcome to CodeCrafter! We're thrilled to have you on board.</p>
    ${roleSpecificMessage}
    <p>Get started by exploring your dashboard:</p>
    <p><a href="${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard" style="display: inline-block; background-color: #007ACC; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Dashboard</a></p>
  `;
  return getEmailWrapper("Welcome to CodeCrafter!", content);
}

export async function getDeveloperApprovedEmailTemplate(developerName: string): Promise<string> {
  const content = `
    <p>Hi ${developerName},</p>
    <p>Great news! Your developer account on CodeCrafter has been approved.</p>
    <p>You can now browse open projects and apply for those that match your skills. Make sure your profile is up-to-date to attract the best opportunities.</p>
    <p><a href="${typeof window !== 'undefined' ? window.location.origin : ''}/dashboard" style="display: inline-block; background-color: #007ACC; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Your Dashboard</a></p>
  `;
  return getEmailWrapper("Your Developer Account is Approved!", content);
}

export async function getDeveloperRejectedEmailTemplate(developerName: string): Promise<string> {
  const content = `
    <p>Hi ${developerName},</p>
    <p>Thank you for your interest in joining CodeCrafter as a developer. After reviewing your application, we've decided not to proceed at this time.</p>
    <p>We appreciate you taking the time to apply. We encourage you to continue developing your skills and wish you the best in your future endeavors.</p>
    <p>If you have any questions, please feel free to contact our support.</p>
  `;
  return getEmailWrapper("Update on Your CodeCrafter Developer Application", content);
}


export async function getClientProjectPostedEmailTemplate(clientName: string, projectName: string, projectId: string): Promise<string> {
  const content = `
    <p>Hi ${clientName},</p>
    <p>Your project, "<strong>${projectName}</strong>," has been successfully posted on CodeCrafter!</p>
    <p>Our AI is already working to find suitable developer matches for you. You can view your project and its matches here:</p>
    <p><a href="${typeof window !== 'undefined' ? window.location.origin : ''}/projects/${projectId}/matchmaking" style="display: inline-block; background-color: #007ACC; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Your Project</a></p>
    <p>We'll keep you updated on any significant activity related to your project.</p>
  `;
  return getEmailWrapper("Your Project Has Been Posted!", content);
}


/**
 * Mock function to simulate sending an email.
 * In a real application, this would use an email service provider (SendGrid, Mailgun, etc.).
 */
export async function sendEmail(to: string, subject: string, htmlBody: string): Promise<void> {
  console.log("--- SIMULATING EMAIL SEND ---");
  console.log("To:", to);
  console.log("Subject:", subject);
  // For brevity in console, maybe just log the first few lines of the body or a summary
  console.log("Body (first 200 chars):", htmlBody.substring(0, 200) + "..."); 
  // console.log("Full Body HTML:\n", htmlBody); // Uncomment to see full HTML

  // Simulate a delay as if an email service was called
  await new Promise(resolve => setTimeout(resolve, 500));

  // In a real scenario, you would handle potential errors from the email service here.
  // For this mock, we'll assume it's always successful.
  console.log("--- EMAIL SIMULATION COMPLETE ---");
}


