// Match developers with clients based on project requirements, skills, availability, and time zone.

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MatchDevelopersInputSchema = z.object({
  projectRequirements: z
    .string()
    .describe('Detailed description of the project requirements.'),
  requiredSkills: z
    .array(z.string())
    .describe('List of required skills for the project.'),
  availability: z
    .string()
    .describe(
      'The availability of the client, including preferred meeting times and deadlines.'
    ),
  timeZone: z.string().describe('The time zone of the client.'),
});

export type MatchDevelopersInput = z.infer<typeof MatchDevelopersInputSchema>;

const MatchDevelopersOutputSchema = z.object({
  developerMatches: z
    .array(z.string())
    .describe(
      'A list of developer profiles that are the best fit for the project.'
    ),
  reasoning: z
    .string()
    .describe('Explanation of why the developers were matched.'),
});

export type MatchDevelopersOutput = z.infer<typeof MatchDevelopersOutputSchema>;

export async function matchDevelopers(
  input: MatchDevelopersInput
): Promise<MatchDevelopersOutput> {
  return matchDevelopersFlow(input);
}

const matchDevelopersPrompt = ai.definePrompt({
  name: 'matchDevelopersPrompt',
  input: {schema: MatchDevelopersInputSchema},
  output: {schema: MatchDevelopersOutputSchema},
  prompt: `You are an AI assistant designed to match clients with the best-fit developers.

Analyze the project requirements, required skills, client availability, and time zone to identify suitable developers.

Project Requirements: {{{projectRequirements}}}
Required Skills: {{#each requiredSkills}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
Availability: {{{availability}}}
Time Zone: {{{timeZone}}}

Based on this information, identify the best-fit developers and explain your reasoning.
`,
});

const matchDevelopersFlow = ai.defineFlow(
  {
    name: 'matchDevelopersFlow',
    inputSchema: MatchDevelopersInputSchema,
    outputSchema: MatchDevelopersOutputSchema,
  },
  async input => {
    const {output} = await matchDevelopersPrompt(input);
    return output!;
  }
);
