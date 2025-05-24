
// src/lib/emailService.ts
"use server";

import type { User } from "@/types";

// --- Basic HTML Email Templates ---

function getEmailWrapper(title: string, content: string): string {
  // This basic wrapper remains the same.
  // EmailJS will take this entire HTML string.
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
 * Sends an email using EmailJS API.
 * Ensure EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID_GENERIC, EMAILJS_USER_ID, and EMAILJS_PRIVATE_KEY
 * are set in your .env.local.
 */
export async function sendEmail(to: string, subject: string, htmlBody: string): Promise<void> {
  const {
    EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID_GENERIC,
    EMAILJS_USER_ID, // Public Key
    EMAILJS_PRIVATE_KEY, // Access Token / Private Key
    APP_EMAIL_FROM_NAME
  } = process.env;

  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID_GENERIC || !EMAILJS_USER_ID || !EMAILJS_PRIVATE_KEY) {
    console.error("EmailJS environment variables not fully configured. Email will be logged to console instead.");
    console.log("--- MOCK EMAIL (EmailJS Config Missing) ---");
    console.log("To:", to);
    console.log("Subject:", subject);
    console.log("Body (first 200 chars):", htmlBody.substring(0, 200) + "...");
    console.log("--- END MOCK EMAIL ---");
    return;
  }

  const templateParams = {
    to_email: to,
    from_name: APP_EMAIL_FROM_NAME || "CodeCrafter",
    subject_line: subject,
    html_body_content: htmlBody,
    // You might need to add other parameters here if your EmailJS template expects them,
    // e.g., reply_to_email: "your_support_email@example.com"
  };

  const data = {
    service_id: EMAILJS_SERVICE_ID,
    template_id: EMAILJS_TEMPLATE_ID_GENERIC,
    user_id: EMAILJS_USER_ID,
    accessToken: EMAILJS_PRIVATE_KEY, // Use the private key for server-to-server API calls
    template_params: templateParams,
  };

  try {
    console.log(`Attempting to send email via EmailJS to: ${to} with subject: ${subject}`);
    const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      console.log(`EmailJS: Successfully sent email to ${to}. Response: ${await response.text()}`);
    } else {
      const errorText = await response.text();
      console.error(`EmailJS: Failed to send email. Status: ${response.status}, Response: ${errorText}`);
      // Fallback to console log for critical visibility if sending fails
      console.log("--- FAILED EMAILJS ATTEMPT (Details above) ---");
      console.log("To:", to);
      console.log("Subject:", subject);
      console.log("Body (first 200 chars):", htmlBody.substring(0, 200) + "...");
      console.log("--- END FAILED EMAILJS ATTEMPT ---");
    }
  } catch (error) {
    console.error("Error sending email via EmailJS:", error);
    // Fallback for network or unexpected errors
    console.log("--- FAILED EMAILJS ATTEMPT (Network/Exception) ---");
    console.log("To:", to);
    console.log("Subject:", subject);
    console.log("Body (first 200 chars):", htmlBody.substring(0, 200) + "...");
    console.log("--- END FAILED EMAILJS ATTEMPT ---");
  }
}
