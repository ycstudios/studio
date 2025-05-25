
// src/lib/emailService.ts
'use server';

import type { QuickServiceRequestData, User } from '@/types';
import nodemailer from 'nodemailer';

const APP_EMAIL_FROM_NAME = process.env.APP_EMAIL_FROM_NAME || "CodeCrafter";
const NEXT_PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:9002';

function getEmailWrapper(title: string, content: string): string {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 20px auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #0A0F1C; color: #FFFFFF; padding: 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">${APP_EMAIL_FROM_NAME}</h1>
      </div>
      <div style="padding: 20px;">
        <h2 style="color: #007ACC; font-size: 20px;">${title}</h2>
        ${content}
        <p style="margin-top: 30px; font-size: 0.9em; color: #555;">
          Thank you for using ${APP_EMAIL_FROM_NAME}!<br/>
          The ${APP_EMAIL_FROM_NAME} Team
        </p>
        <p style="font-size: 0.8em; color: #777;">If you need assistance, please contact us through our support channels on <a href="${NEXT_PUBLIC_BASE_URL}" style="color: #007ACC;">${NEXT_PUBLIC_BASE_URL}</a>.</p>
      </div>
      <div style="background-color: #f8f8f8; color: #777; padding: 15px; text-align: center; font-size: 0.8em;">
        <p>&copy; ${new Date().getFullYear()} ${APP_EMAIL_FROM_NAME}. All rights reserved.</p>
        <p>If you received this email in error, please ignore it.</p>
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
    <p>Welcome to ${APP_EMAIL_FROM_NAME}! We're thrilled to have you on board.</p>
    ${roleSpecificMessage}
    <p>Get started by exploring your dashboard:</p>
    <p><a href="${NEXT_PUBLIC_BASE_URL}/dashboard" style="display: inline-block; background-color: #007ACC; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Dashboard</a></p>
  `;
  return getEmailWrapper(`Welcome to ${APP_EMAIL_FROM_NAME}!`, content);
}

export async function getDeveloperApprovedEmailTemplate(developerName: string): Promise<string> {
  const content = `
    <p>Hi ${developerName},</p>
    <p>Great news! Your developer account on ${APP_EMAIL_FROM_NAME} has been approved.</p>
    <p>You can now browse open projects and apply for those that match your skills. Make sure your profile is up-to-date to attract the best opportunities.</p>
    <p><a href="${NEXT_PUBLIC_BASE_URL}/dashboard" style="display: inline-block; background-color: #007ACC; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Your Dashboard</a></p>
  `;
  return getEmailWrapper("Your Developer Account is Approved!", content);
}

export async function getDeveloperRejectedEmailTemplate(developerName: string): Promise<string> {
  const content = `
    <p>Hi ${developerName},</p>
    <p>Thank you for your interest in joining ${APP_EMAIL_FROM_NAME} as a developer. After reviewing your application, we've decided not to proceed at this time.</p>
    <p>We appreciate you taking the time to apply. We encourage you to continue developing your skills and wish you the best in your future endeavors.</p>
    <p>If you have any questions, please feel free to contact our support.</p>
  `;
  return getEmailWrapper(`Update on Your ${APP_EMAIL_FROM_NAME} Developer Application`, content);
}

export async function getClientProjectPostedEmailTemplate(clientName: string, projectName: string, projectId: string): Promise<string> {
  const content = `
    <p>Hi ${clientName},</p>
    <p>Your project, "<strong>${projectName}</strong>," has been successfully posted on ${APP_EMAIL_FROM_NAME}!</p>
    <p>Our AI is already working to find suitable developer matches for you. You can view your project, its matches, and any applications here:</p>
    <p><a href="${NEXT_PUBLIC_BASE_URL}/projects/${projectId}/matchmaking" style="display: inline-block; background-color: #007ACC; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Your Project</a></p>
    <p>We'll keep you updated on any significant activity related to your project.</p>
  `;
  return getEmailWrapper("Your Project Has Been Posted!", content);
}

export async function getNewProjectApplicationEmailToClient(clientName: string, developerName: string, projectName: string, projectId: string): Promise<string> {
  const content = `
    <p>Hi ${clientName},</p>
    <p>You have received a new application for your project "<strong>${projectName}</strong>" from developer <strong>${developerName}</strong>.</p>
    <p>You can review this application and others by visiting your project page:</p>
    <p><a href="${NEXT_PUBLIC_BASE_URL}/projects/${projectId}/matchmaking#applications" style="display: inline-block; background-color: #007ACC; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Project Applications</a></p>
  `;
  return getEmailWrapper(`New Application for "${projectName}"`, content);
}

export async function getApplicationAcceptedEmailToDeveloper(developerName: string, projectName: string, projectId: string): Promise<string> {
  const content = `
    <p>Hi ${developerName},</p>
    <p>Congratulations! Your application for the project "<strong>${projectName}</strong>" on ${APP_EMAIL_FROM_NAME} has been accepted by the client.</p>
    <p>You can view the project details and prepare to get started. The client may reach out to you soon, or you can initiate contact through the platform's messaging system (once available) or by coordinating with ${APP_EMAIL_FROM_NAME} support if needed.</p>
    <p><a href="${NEXT_PUBLIC_BASE_URL}/projects/${projectId}/matchmaking" style="display: inline-block; background-color: #007ACC; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Project</a></p>
  `;
  return getEmailWrapper(`Application Accepted for "${projectName}"!`, content);
}

export async function getApplicationRejectedEmailToDeveloper(developerName: string, projectName: string, projectId: string): Promise<string> {
  const content = `
    <p>Hi ${developerName},</p>
    <p>Thank you for applying for the project "<strong>${projectName}</strong>" on ${APP_EMAIL_FROM_NAME}.</p>
    <p>The client has reviewed applications and has decided to move forward with another candidate for this project at this time.</p>
    <p>We encourage you to continue applying for other projects that match your skills. There are many opportunities on ${APP_EMAIL_FROM_NAME}!</p>
    <p><a href="${NEXT_PUBLIC_BASE_URL}/dashboard" style="display: inline-block; background-color: #007ACC; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Browse Other Projects</a></p>
  `;
  return getEmailWrapper(`Update on Your Application for "${projectName}"`, content);
}


export async function getQuickServiceRequestAdminNotificationHtml(formData: QuickServiceRequestData): Promise<string> {
  const content = `
    <p>A new quick service request has been submitted through the ${APP_EMAIL_FROM_NAME} landing page:</p>
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
  const content = `
    <p>Hi ${formData.name},</p>
    <p>Thank you for submitting your service request to ${APP_EMAIL_FROM_NAME}! We've received the following details:</p>
    <ul>
      <li><strong>Description:</strong><br/><pre style="white-space: pre-wrap; background-color: #f9f9f9; padding: 10px; border-radius: 4px;">${formData.description}</pre></li>
      ${formData.budget ? `<li><strong>Budget Range:</strong> ${formData.budget}</li>` : ''}
      ${formData.urgency ? `<li><strong>Urgency:</strong> ${formData.urgency}</li>` : ''}
    </ul>
    <p>Our team will review your request and get in touch with you shortly to discuss how we can help you find the perfect developer.</p>
    <p>In the meantime, feel free to <a href="${NEXT_PUBLIC_BASE_URL}/signup" style="color: #007ACC;">create an account</a> to explore more features.</p>
  `;
  return getEmailWrapper("We've Received Your Service Request!", content);
}


export async function sendEmail(to: string, subject: string, htmlBody: string, fromNameParam?: string, replyToParam?: string): Promise<void> {
  console.log("[EmailService Server Action] Attempting to send email.");

  const EMAIL_SERVER_USER = process.env.EMAIL_SERVER_USER;
  const EMAIL_SERVER_PASSWORD = process.env.EMAIL_SERVER_PASSWORD;
  let EMAIL_FROM = process.env.EMAIL_FROM;

  console.log("[EmailService Server Action] Validating ENV VARS for Nodemailer/Gmail:");
  console.log(`  > EMAIL_SERVER_USER: ${EMAIL_SERVER_USER ? `******** (PRESENT OK)` : 'MISSING! Email sending will likely fail.'}`);
  console.log(`  > EMAIL_SERVER_PASSWORD: ${EMAIL_SERVER_PASSWORD ? '******** (PRESENT OK)' : 'MISSING! Email sending will likely fail.'}`);
  console.log(`  > EMAIL_FROM: ${EMAIL_FROM ? `'${EMAIL_FROM}' (PRESENT OK)` : 'MISSING! Using default.'}`);
  
  if (!EMAIL_FROM) {
      EMAIL_FROM = `"${APP_EMAIL_FROM_NAME}" <${EMAIL_SERVER_USER || 'noreply@example.com'}>`;
      console.log(`[EmailService Server Action] EMAIL_FROM was missing, defaulted to: ${EMAIL_FROM}`);
  }

  if (!EMAIL_SERVER_USER || !EMAIL_SERVER_PASSWORD) {
    const errorMsg = "Nodemailer/Gmail email configuration is incomplete. Required environment variables (EMAIL_SERVER_USER, EMAIL_SERVER_PASSWORD) are missing. Email not sent. Check server logs and environment variable setup.";
    console.error("--- MOCK EMAIL (Nodemailer/Gmail Config Incomplete) ---");
    console.error(errorMsg);
    console.log("Intended To:", to);
    console.log("Intended From:", fromNameParam ? `"${fromNameParam}" <${EMAIL_SERVER_USER}>` : EMAIL_FROM);
    console.log("Intended Reply To:", replyToParam || to); // Default replyTo to the recipient if not specified
    console.log("Intended Subject:", subject);
    // console.log("Intended HTML Body (first 200 chars):", htmlBody.substring(0, 200) + "...");
    console.log("--- END MOCK EMAIL ---");
    // Do not throw error here to allow main operation (e.g., user creation) to succeed even if email fails.
    // The calling function should handle this possibility.
    // throw new Error(errorMsg); 
    return; // Exit if config is incomplete
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, 
    auth: {
      user: EMAIL_SERVER_USER,
      pass: EMAIL_SERVER_PASSWORD, 
    },
    // logger: true, // Enable for extreme debugging if needed
    // debug: true, // Enable for extreme debugging if needed
  });

  const mailOptions = {
    from: fromNameParam ? `"${fromNameParam}" <${EMAIL_SERVER_USER}>` : EMAIL_FROM,
    to: to,
    replyTo: replyToParam || undefined, // Only set replyTo if provided
    subject: subject,
    html: htmlBody,
  };

  try {
    console.log(`[EmailService Server Action] Sending email to ${to} with subject "${subject}" via Nodemailer/Gmail...`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`[EmailService Server Action] Email sent successfully via Nodemailer/Gmail. Message ID: ${info.messageId}`);
  } catch (error) {
    console.error("[EmailService Server Action] Error sending email via Nodemailer/Gmail:", error);
    if (error instanceof Error && (error as any).responseCode === 535) {
         console.error("[EmailService Server Action] Gmail Authentication Error (535): This often means incorrect EMAIL_SERVER_USER/EMAIL_SERVER_PASSWORD (App Password) or issue with Google Account security settings. If using 2FA, ensure an App Password is used for EMAIL_SERVER_PASSWORD.");
         // Do not re-throw here to allow main operation to continue
    } else if (error instanceof Error) {
        console.error(`[EmailService Server Action] Nodemailer/Gmail failed to send email: ${error.message}`);
    } else {
        console.error('[EmailService Server Action] An unknown error occurred while sending email via Nodemailer/Gmail.');
    }
    // Do not re-throw, let the calling function decide how to handle email failure.
  }
}
