
// src/lib/emailService.ts
'use server';

import type { QuickServiceRequestData, User } from '@/types';
import nodemailer from 'nodemailer';

// --- Basic HTML Email Templates ---

function getEmailWrapper(title: string, content: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002';
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
        <p style="font-size: 0.8em; color: #777;">If you need assistance, please contact us through our support channels on <a href="${baseUrl}" style="color: #007ACC;">${baseUrl}</a>.</p>
      </div>
      <div style="background-color: #f8f8f8; color: #777; padding: 15px; text-align: center; font-size: 0.8em;">
        <p>&copy; ${new Date().getFullYear()} CodeCrafter. All rights reserved.</p>
        <p>If you received this email in error, please ignore it.</p>
      </div>
    </div>
  `;
}

export async function getWelcomeEmailTemplate(userName: string, userRole: User['role']): Promise<string> {
  let roleSpecificMessage = "";
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002';
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
    <p><a href="${baseUrl}/dashboard" style="display: inline-block; background-color: #007ACC; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Dashboard</a></p>
  `;
  return getEmailWrapper("Welcome to CodeCrafter!", content);
}

export async function getDeveloperApprovedEmailTemplate(developerName: string): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002';
  const content = `
    <p>Hi ${developerName},</p>
    <p>Great news! Your developer account on CodeCrafter has been approved.</p>
    <p>You can now browse open projects and apply for those that match your skills. Make sure your profile is up-to-date to attract the best opportunities.</p>
    <p><a href="${baseUrl}/dashboard" style="display: inline-block; background-color: #007ACC; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Your Dashboard</a></p>
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
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002';
  const content = `
    <p>Hi ${clientName},</p>
    <p>Your project, "<strong>${projectName}</strong>," has been successfully posted on CodeCrafter!</p>
    <p>Our AI is already working to find suitable developer matches for you. You can view your project and its matches here:</p>
    <p><a href="${baseUrl}/projects/${projectId}/matchmaking" style="display: inline-block; background-color: #007ACC; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Your Project</a></p>
    <p>We'll keep you updated on any significant activity related to your project.</p>
  `;
  return getEmailWrapper("Your Project Has Been Posted!", content);
}

export async function getQuickServiceRequestAdminNotificationHtml(formData: QuickServiceRequestData): Promise<string> {
  const content = `
    <p>A new quick service request has been submitted through the CodeCrafter landing page:</p>
    <ul>
      <li><strong>Name:</strong> ${formData.name}</li>
      <li><strong>Email:</strong> ${formData.email}</li>
      <li><strong>Description:</strong><br/><pre style="white-space: pre-wrap; background-color: #f9f9f9; padding: 10px; border-radius: 4px;">${formData.description}</pre></li>
      ${formData.budget ? `<li><strong>Budget Range:</strong> ${formData.budget}</li>` : ''}
      ${formData.urgency ? `<li><strong>Urgency:</strong> ${formData.urgency}</li>` : ''}
    </ul>
    <p>Please follow up with this potential client at your earliest convenience.</p>
  `;
  return getEmailWrapper("New Quick Service Request from Landing Page", content);
}

export async function getQuickServiceRequestClientConfirmationHtml(formData: QuickServiceRequestData): Promise<string> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002';
  const content = `
    <p>Hi ${formData.name},</p>
    <p>Thank you for submitting your service request to CodeCrafter! We've received the following details:</p>
    <ul>
      <li><strong>Description:</strong><br/><pre style="white-space: pre-wrap; background-color: #f9f9f9; padding: 10px; border-radius: 4px;">${formData.description}</pre></li>
      ${formData.budget ? `<li><strong>Budget Range:</strong> ${formData.budget}</li>` : ''}
      ${formData.urgency ? `<li><strong>Urgency:</strong> ${formData.urgency}</li>` : ''}
    </ul>
    <p>Our team will review your request and get in touch with you shortly to discuss how we can help you find the perfect developer.</p>
    <p>In the meantime, feel free to <a href="${baseUrl}/signup" style="color: #007ACC;">create an account</a> to explore more features.</p>
  `;
  return getEmailWrapper("We've Received Your Service Request!", content);
}


/**
 * Sends an email using Nodemailer with Gmail.
 * This function MUST run on the server-side.
 */
export async function sendEmail(to: string, subject: string, htmlBody: string, fromNameParam?: string, replyToParam?: string): Promise<void> {
  console.log("[EmailService Server Action] Attempting to send email via Nodemailer/Gmail.");

  const EMAIL_SERVER_USER = process.env.EMAIL_SERVER_USER;
  const EMAIL_SERVER_PASSWORD = process.env.EMAIL_SERVER_PASSWORD;
  const EMAIL_FROM = process.env.EMAIL_FROM;

  let configComplete = true;
  if (!EMAIL_SERVER_USER) { console.warn("  > EMAIL_SERVER_USER: MISSING from .env.local! Cannot send email."); configComplete = false; }
  if (!EMAIL_SERVER_PASSWORD) { console.warn("  > EMAIL_SERVER_PASSWORD: MISSING from .env.local! Cannot send email. Ensure you use a Google App Password if 2FA is enabled."); configComplete = false; }
  if (!EMAIL_FROM) { console.warn("  > EMAIL_FROM: MISSING from .env.local! Using default."); }

  if (!configComplete) {
    const errorMsg = "Nodemailer/Gmail configuration is incomplete. Required environment variables (EMAIL_SERVER_USER, EMAIL_SERVER_PASSWORD) are missing. Email not sent. Check server logs and .env.local file.";
    console.error("--- MOCK EMAIL (Nodemailer/Gmail Config Incomplete) ---");
    console.error(errorMsg);
    console.log("Intended To:", to);
    console.log("Intended From Name:", fromNameParam || EMAIL_FROM || "CodeCrafter");
    console.log("Intended Reply To:", replyToParam || to);
    console.log("Intended Subject:", subject);
    console.log("Intended HTML Body (first 200 chars):", htmlBody.substring(0, 200) + "...");
    console.log("--- END MOCK EMAIL ---");
    throw new Error(errorMsg); // Throw error to be caught by calling function if critical config is missing
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // use SSL
    auth: {
      user: EMAIL_SERVER_USER,
      pass: EMAIL_SERVER_PASSWORD, // For Gmail, this should be an App Password if 2FA is enabled
    },
    // For debugging Nodemailer issues (optional)
    // logger: true,
    // debug: true,
  });

  const mailOptions = {
    from: EMAIL_FROM || `"CodeCrafter" <${EMAIL_SERVER_USER}>`, // sender address
    to: to, // list of receivers
    replyTo: replyToParam || undefined, // optional reply-to address
    subject: subject, // Subject line
    html: htmlBody, // html body
  };

  try {
    console.log(`[EmailService Server Action] Sending email to ${to} with subject "${subject}" via Nodemailer/Gmail...`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EmailService Server Action] Email sent successfully via Nodemailer/Gmail. Message ID: ${info.messageId}`);
  } catch (error) {
    console.error("[EmailService Server Action] Error sending email via Nodemailer/Gmail:", error);
    if (error instanceof Error) {
      throw new Error(`Nodemailer/Gmail failed to send email: ${error.message}`);
    }
    throw new Error('An unknown error occurred while sending email via Nodemailer/Gmail.');
  }
}
