
// src/lib/emailService.ts
"use server"; 

import type { User } from "@/types";
import nodemailer from 'nodemailer';

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
    <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002'}/dashboard" style="display: inline-block; background-color: #007ACC; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Dashboard</a></p>
  `;
  return getEmailWrapper("Welcome to CodeCrafter!", content);
}

export async function getDeveloperApprovedEmailTemplate(developerName: string): Promise<string> {
  const content = `
    <p>Hi ${developerName},</p>
    <p>Great news! Your developer account on CodeCrafter has been approved.</p>
    <p>You can now browse open projects and apply for those that match your skills. Make sure your profile is up-to-date to attract the best opportunities.</p>
    <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002'}/dashboard" style="display: inline-block; background-color: #007ACC; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Your Dashboard</a></p>
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
    <p><a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002'}/projects/${projectId}/matchmaking" style="display: inline-block; background-color: #007ACC; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Your Project</a></p>
    <p>We'll keep you updated on any significant activity related to your project.</p>
  `;
  return getEmailWrapper("Your Project Has Been Posted!", content);
}


/**
 * Sends an email using Nodemailer with Gmail.
 * Ensure EMAIL_SERVER_USER, EMAIL_SERVER_PASSWORD, and EMAIL_FROM are set in your .env.local.
 * For Gmail, EMAIL_SERVER_PASSWORD should be an App Password if 2FA is enabled.
 */
export async function sendEmail(to: string, subject: string, htmlBody: string): Promise<void> {
  // Configuration for Nodemailer using Gmail
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465, // Use 465 for SSL
    secure: true, // true for 465, false for other ports like 587
    auth: {
      user: process.env.EMAIL_SERVER_USER, // Your Gmail address from .env.local
      pass: process.env.EMAIL_SERVER_PASSWORD, // Your Gmail App Password or regular password from .env.local
    },
    // Optional: Add stricter TLS options for production if needed
    // tls: {
    //   rejectUnauthorized: true, // This will reject self-signed certificates
    // },
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"CodeCrafter" <${process.env.EMAIL_SERVER_USER}>`, // Sender address
    to: to, // List of receivers
    subject: subject, // Subject line
    html: htmlBody, // HTML body
  };

  try {
    console.log(`Attempting to send email to: ${to} with subject: ${subject}`);
    if (!process.env.EMAIL_SERVER_USER || !process.env.EMAIL_SERVER_PASSWORD) {
        console.error("Email server user or password not configured in environment variables. Email will not be sent.");
        // Fallback to console log if email credentials aren't set for local dev without email setup
        console.log("--- MOCK EMAIL (Credentials Missing) ---");
        console.log("To:", to);
        console.log("Subject:", subject);
        console.log("Body (first 200 chars):", htmlBody.substring(0, 200) + "...");
        console.log("--- END MOCK EMAIL ---");
        return; // Don't attempt to send if critical env vars are missing
    }
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully! Message ID:", info.messageId);
  } catch (error) {
    console.error("Error sending email:", error);
    // In a production app, you might want to re-throw or handle this more gracefully,
    // e.g., by queuing the email for a retry.
    // For now, we just log the error.
    // throw new Error(`Failed to send email: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/*
// --- MOCK EMAIL FUNCTION (Kept for reference or if Nodemailer setup fails) ---
export async function sendEmailMock(to: string, subject: string, htmlBody: string): Promise<void> {
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
*/
