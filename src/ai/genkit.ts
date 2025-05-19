
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
  // In a production environment, you might want to log this error and prevent startup,
  // or allow Genkit to initialize if some parts of the app can function without AI.
  // For now, we'll throw an error to make it clear during development/deployment.
  console.warn(
    "GEMINI_API_KEY is not set. Genkit's Google AI plugin may not function correctly." +
    " Ensure this environment variable is set in your deployment environment for AI features."
  );
  // Depending on the strictness required, you could throw an error here:
  // throw new Error("GEMINI_API_KEY is not set. AI features will not work.");
}

export const ai = genkit({
  plugins: [googleAI({apiKey: geminiApiKey})], // Pass the key if available, googleAI might also pick it up from env
  model: 'googleai/gemini-2.0-flash',
});
