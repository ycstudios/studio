
// src/lib/emailService.ts
"use server";

import type { User, QuickServiceRequestData } from "@/types";

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
 * Sends an email using EmailJS API.
 */
export async function sendEmail(to: string, subject: string, htmlBody: string, fromNameParam?: string, replyToParam?: string): Promise<void> {
  const {
    EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID_GENERIC,
    EMAILJS_USER_ID,
    EMAILJS_PRIVATE_KEY,
    APP_EMAIL_FROM_NAME
  } = process.env;

  console.log("[EmailService Server Action] Attempting to send email. Validating ENV VARS:");
  console.log(`  > EMAILJS_SERVICE_ID: ${EMAILJS_SERVICE_ID ? `'${EMAILJS_SERVICE_ID}' (OK)` : 'MISSING!'}`);
  console.log(`  > EMAILJS_TEMPLATE_ID_GENERIC: ${EMAILJS_TEMPLATE_ID_GENERIC ? `'${EMAILJS_TEMPLATE_ID_GENERIC}' (OK)` : 'MISSING!'}`);
  console.log(`  > EMAILJS_USER_ID (Public Key): ${EMAILJS_USER_ID ? `'${EMAILJS_USER_ID}' (OK)` : 'MISSING!'}`);
  console.log(`  > EMAILJS_PRIVATE_KEY (Access Token): ${EMAILJS_PRIVATE_KEY ? 'PRESENT (OK)' : 'MISSING!'}`);
  console.log(`  > APP_EMAIL_FROM_NAME: ${APP_EMAIL_FROM_NAME ? `'${APP_EMAIL_FROM_NAME}' (OK)` : 'MISSING (will use default)'}`);

  let emailJsConfigComplete = true;
  if (!EMAILJS_SERVICE_ID) emailJsConfigComplete = false;
  if (!EMAILJS_TEMPLATE_ID_GENERIC) emailJsConfigComplete = false;
  if (!EMAILJS_USER_ID) emailJsConfigComplete = false;
  if (!EMAILJS_PRIVATE_KEY) emailJsConfigComplete = false;


  if (!emailJsConfigComplete) {
    console.warn("--- MOCK EMAIL (EmailJS Config Incomplete or Missing in server environment. Check .env.local and Vercel ENV VARS) ---");
    console.log("To:", to);
    console.log("From Name:", fromNameParam || APP_EMAIL_FROM_NAME || "CodeCrafter");
    console.log("Reply To:", replyToParam || to);
    console.log("Subject:", subject);
    console.log("HTML Body (first 200 chars):", htmlBody.substring(0, 200) + "...");
    console.log("--- END MOCK EMAIL ---");
    // Optionally, you might want to throw an error here if email sending is critical for this flow,
    // or just return if it's a non-critical notification.
    // For now, let's return to allow the rest of the operation (e.g., user creation) to proceed.
    return;
  }

  const effectiveFromName = fromNameParam || APP_EMAIL_FROM_NAME || "CodeCrafter";
  const effectiveReplyTo = replyToParam || to;

  const templateParams = {
    to_email: to,
    from_name: effectiveFromName,
    reply_to_email: effectiveReplyTo,
    subject_line: subject,
    html_body_content: htmlBody,
  };

  const data = {
    service_id: EMAILJS_SERVICE_ID,
    template_id: EMAILJS_TEMPLATE_ID_GENERIC,
    user_id: EMAILJS_USER_ID,
    accessToken: EMAILJS_PRIVATE_KEY, // This is the private key
    template_params: templateParams,
  };

  console.log("[EmailService Server Action] Payload to EmailJS (template_params only):", JSON.stringify(templateParams, null, 2));
  console.log(`[EmailService Server Action] AccessToken (Private Key) for EmailJS API call is ${EMAILJS_PRIVATE_KEY ? 'PRESENT' : 'MISSING'}.`);


  try {
    console.log(`[EmailService Server Action] Attempting to send email to ${to} with subject "${subject}" via EmailJS API...`);
    const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const responseText = await response.text();
    if (response.ok) {
      console.log(`[EmailService Server Action] Successfully sent email to ${to} via EmailJS. Response: ${responseText}`);
    } else {
      console.error(`[EmailService Server Action] Failed to send email via EmailJS. Status: ${response.status}, Raw Response: ${responseText}`);
      throw new Error(`EmailJS failed to send email. Status: ${response.status}. ${responseText}`);
    }
  } catch (error) {
    console.error("[EmailService Server Action] Network or other error sending email via EmailJS:", error);
    if (error instanceof Error) {
      throw new Error(`Network or other error sending email via EmailJS: ${error.message}`);
    }
    throw new Error('An unknown error occurred while sending email via EmailJS.');
  }
}

    