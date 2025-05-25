'use server';
/**
 * @fileOverview An AI flow to match projects with suitable developers from the platform.
 *
 * - matchDevelopers - A function that handles the developer matching process.
 * - MatchDevelopersInput - The input type for the matchDevelopers function.
 * - MatchDevelopersOutput - The return type for the matchDevelopers function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getAllUsers } from '@/lib/firebaseService'; // Ensure this path is correct

// Schema for the developer profile details passed to the AI for matching
const DeveloperProfileForAISchema = z.object({
  id: z.string().describe("The unique ID of the developer."),
  name: z.string().optional().describe("The name of the developer."),
  skills: z.array(z.string()).optional().describe("List of developer's skills."),
  experienceLevel: z.string().optional().describe("Developer's experience level (e.g., Junior, Mid-level, Senior)."),
  hourlyRate: z.number().optional().describe("Developer's hourly rate in USD."),
  bio: z.string().optional().describe("A brief biography or summary from the developer."),
  // Consider adding other fields if they are relevant for matching, e.g., past project types, timezone.
});
export type DeveloperProfileForAI = z.infer<typeof DeveloperProfileForAISchema>;

// Tool to get available active developers from Firestore
const getAvailableDevelopersTool = ai.defineTool(
  {
    name: 'getAvailableDevelopersTool',
    description: 'Fetches a list of all active and approved developers from the platform database, including their profiles.',
    inputSchema: z.object({}), // No specific input needed for this tool currently
    outputSchema: z.array(DeveloperProfileForAISchema),
  },
  async () => {
    console.log('[getAvailableDevelopersTool] Fetching active developers from Firestore...');
    try {
      const allUsers = await getAllUsers();
      const activeDevelopers = allUsers
        .filter(user => user.role === 'developer' && user.accountStatus === 'active')
        .map(dev => ({
          id: dev.id,
          name: dev.name || "Unnamed Developer",
          skills: dev.skills || [],
          experienceLevel: dev.experienceLevel || "Not specified",
          hourlyRate: dev.hourlyRate,
          bio: dev.bio || "No bio provided.",
        }));
      console.log(`[getAvailableDevelopersTool] Found ${activeDevelopers.length} active developers.`);
      return activeDevelopers;
    } catch (error) {
      console.error('[getAvailableDevelopersTool] Error fetching developers:', error);
      // In a production system, you might want to throw or have more robust error handling.
      // Returning an empty array means the AI will be told no developers are available.
      return [];
    }
  }
);

// Input schema for the overall matchDevelopers flow
const MatchDevelopersInputSchema = z.object({
  projectId: z.string().describe("The ID of the project needing matches."),
  projectName: z.string().describe("The name of the project."),
  projectRequirements: z.string().describe('Detailed description of the project requirements.'),
  requiredSkills: z.array(z.string()).describe('List of required skills for the project.'),
  availability: z.string().describe('The availability of the client, including preferred meeting times and deadlines.'),
  timeZone: z.string().describe('The time zone of the client.'),
});
export type MatchDevelopersInput = z.infer<typeof MatchDevelopersInputSchema>;

// Output schema for an individual matched developer
const MatchedDeveloperSchema = z.object({
  developerId: z.string().describe("The ID of the matched developer from the provided list."),
  developerName: z.string().describe("The name of the matched developer."),
  matchScore: z.number().optional().describe("A score from 0.0 to 1.0 indicating the quality of the match (1.0 is a perfect match), if calculable."),
  reasoningForThisMatch: z.string().optional().describe("Specific reasons why this developer is a good match for the project.")
});
export type MatchedDeveloper = z.infer<typeof MatchedDeveloperSchema>;

// Output schema for the overall matchDevelopers flow
const MatchDevelopersOutputSchema = z.object({
  matchedDevelopers: z.array(MatchedDeveloperSchema).describe("A list of developer profiles (from the input list) that are the best fit for the project."),
  overallReasoning: z.string().describe("Overall explanation of why these developers were matched, or general observations if no good matches were found.")
});
export type MatchDevelopersOutput = z.infer<typeof MatchDevelopersOutputSchema>;

// Input schema for the prompt itself (combines project details and available developers)
const PromptInputSchema = z.object({
  projectDetails: MatchDevelopersInputSchema,
  availableDevelopers: z.array(DeveloperProfileForAISchema),
});

// The AI prompt for matching
const matchDevelopersPrompt = ai.definePrompt({
  name: 'matchDevelopersPrompt',
  input: { schema: PromptInputSchema },
  output: { schema: MatchDevelopersOutputSchema },
  prompt: `You are an AI assistant specializing in matching software development projects to suitable freelance developers.
You will be given:
1. Detailed project requirements (description, required skills, client availability, timezone).
2. A list of available developers with their profiles (ID, name, skills, experience level, hourly rate, bio).

Your task is to:
- Carefully analyze the project requirements.
- Evaluate each developer from the provided "Available Developers" list against these requirements.
- Identify the top 3-5 developers who are the best fit. If fewer than 3 are a good fit, recommend only those who are.
- For each selected developer, you MUST provide their 'developerId' and 'developerName' exactly as they appear in the input list.
- Optionally, provide a 'matchScore' (0.0 to 1.0, where 1.0 is ideal) and a brief 'reasoningForThisMatch'.
- Provide an 'overallReasoning' for your selections. If no developers from the list are a good fit, your 'matchedDevelopers' array should be empty, and your 'overallReasoning' should clearly explain why (e.g., skill mismatch, experience level too low, etc.).
- Do NOT invent new developers or suggest developers not present in the "Available Developers" list.
- Ensure your output strictly adheres to the JSON schema for MatchDevelopersOutput.

Project Details:
  Project Name: \${projectDetails.projectName}
  Project ID: \${projectDetails.projectId}
  Description: \${projectDetails.projectRequirements}
  Required Skills: \${projectDetails.requiredSkills.length ? projectDetails.requiredSkills.join(', ') : 'None specified'}
  Client Availability: \${projectDetails.availability}
  Client Time Zone: \${projectDetails.timeZone}

Available Developers:
\${availableDevelopers.length ? availableDevelopers.map(dev => `
  - Developer ID: \${dev.id}
    Name: \${dev.name}
    Skills: \${dev.skills.length ? dev.skills.join(', ') : 'Not specified'}
    Experience Level: \${dev.experienceLevel}
    Hourly Rate: \${dev.hourlyRate ? `$${dev.hourlyRate}/hr` : 'Not specified'}
    Bio: \${dev.bio}
  ------------------------------------`).join('\n') : '  No developers were found in the provided list of available developers.'}
`,
});

// The main flow function
const matchDevelopersFlow = ai.defineFlow(
  {
    name: 'matchDevelopersFlow',
    inputSchema: MatchDevelopersInputSchema, // Flow takes the client's project input
    outputSchema: MatchDevelopersOutputSchema,
  },
  async (projectInput) => {
    console.log('[matchDevelopersFlow] Received project input:', JSON.stringify(projectInput, null, 2));

    // Step 1: Fetch available developers using the tool
    // Note: In Genkit v1.x, tools are usually passed to the `generate` or `prompt` call for the LLM to decide to use them.
    // However, for this specific use case where we *always* need the developer list first,
    // we can call the tool's function directly.
    const availableDevelopers = await getAvailableDevelopersTool({}); // Call the tool's function directly
    console.log(`[matchDevelopersFlow] Fetched ${availableDevelopers.length} available developers.`);

    if (availableDevelopers.length === 0) {
      console.warn('[matchDevelopersFlow] No active developers found in the database. Returning empty matches.');
      return {
        matchedDevelopers: [],
        overallReasoning: "No active developers are currently available on the platform to match against this project. Please check back later, ensure developers are registered and approved, or contact support.",
      };
    }

    // Step 2: Prepare input for the LLM prompt
    const promptPayload = {
      projectDetails: projectInput,
      availableDevelopers: availableDevelopers,
    };

    // Step 3: Call the LLM prompt
    console.log('[matchDevelopersFlow] Calling LLM to find matches...');
    try {
      const { output } = await matchDevelopersPrompt(promptPayload);

      if (!output) {
        console.error('[matchDevelopersFlow] LLM did not return a structured output. This might indicate a problem with the prompt or the model understanding the schema.');
        // Consider returning a more informative error or a default empty match.
        return {
          matchedDevelopers: [],
          overallReasoning: "The AI matchmaking process did not return any specific developer matches. This could be due to a lack of suitable candidates in the current developer pool or an issue with the AI's analysis. Please review the project requirements or try again later."
        };
      }
      console.log('[matchDevelopersFlow] LLM output received:', JSON.stringify(output, null, 2));
      return output;

    } catch (error) {
      console.error('[matchDevelopersFlow] Error during LLM call:', error);
      // Provide a user-friendly error message in the output
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred during AI processing.";
      return {
        matchedDevelopers: [],
        overallReasoning: `AI matchmaking encountered an error: ${errorMessage}. Please try again or contact support if the issue persists.`
      };
    }
  }
);

// Exported wrapper function
export async function matchDevelopers(input: MatchDevelopersInput): Promise<MatchDevelopersOutput> {
  return matchDevelopersFlow(input);
}

    