
import { config as dotenvConfig } from 'dotenv';

// Attempt to load .env and log the result
console.log('[Genkit Dev] Attempting to load .env file from project root...');
const dotenvResult = dotenvConfig();

if (dotenvResult.error) {
  console.error('[Genkit Dev] Error loading .env file:', dotenvResult.error.message);
  console.warn('[Genkit Dev] Ensure a .env file exists in the project root (same directory as package.json).');
} else {
  if (dotenvResult.parsed) {
    console.log('[Genkit Dev] Successfully loaded .env file. Parsed variables (only keys shown for security):', Object.keys(dotenvResult.parsed));
    if (dotenvResult.parsed.GOOGLE_API_KEY) {
      console.log('[Genkit Dev] GOOGLE_API_KEY was found in the parsed .env file.');
    } else if (dotenvResult.parsed.GEMINI_API_KEY) {
      console.log('[Genkit Dev] GEMINI_API_KEY was found in the parsed .env file.');
    } else {
      console.warn('[Genkit Dev] GOOGLE_API_KEY or GEMINI_API_KEY was NOT found directly in the parsed .env file by src/ai/dev.ts.');
    }
  } else {
    console.warn('[Genkit Dev] .env file was loaded, but no variables were parsed. Is the file empty or malformed?');
  }
}

// Check process.env *after* dotenv has run.
// Genkit's googleAI plugin will check process.env for these keys.
if (process.env.GOOGLE_API_KEY) {
  console.log(`[Genkit Dev] process.env.GOOGLE_API_KEY is set. Length: ${process.env.GOOGLE_API_KEY.length}. Genkit should find this.`);
} else if (process.env.GEMINI_API_KEY) {
  console.log(`[Genkit Dev] process.env.GEMINI_API_KEY is set. Length: ${process.env.GEMINI_API_KEY.length}. Genkit should find this.`);
} else {
  console.warn('[Genkit Dev] process.env.GOOGLE_API_KEY or process.env.GEMINI_API_KEY is NOT set in the environment *after* dotenv.config() was called in src/ai/dev.ts.');
  console.warn('[Genkit Dev] This is likely why the googleAI plugin is failing.');
}

console.log('[Genkit Dev] Now attempting to import flows and initialize Genkit plugins...');
// Important: Keep flow imports *after* the dotenv and process.env checks.
import '@/ai/flows/match-developers.ts';

// If you add more flows, import them here as well.
// e.g., import '@/ai/flows/another-flow.ts';

console.log('[Genkit Dev] Genkit dev script (src/ai/dev.ts) has finished its initial setup.');
