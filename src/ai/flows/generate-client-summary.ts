// use server'
'use server';

/**
 * @fileOverview Generates a summary of client information based on notes.
 *
 * - generateClientSummary - A function that generates the client summary.
 * - GenerateClientSummaryInput - The input type for the generateClientSummary function.
 * - GenerateClientSummaryOutput - The return type for the generateClientSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateClientSummaryInputSchema = z.object({
  notes: z
    .string()
    .describe('Notes about the client.'),
});
export type GenerateClientSummaryInput = z.infer<typeof GenerateClientSummaryInputSchema>;

const GenerateClientSummaryOutputSchema = z.object({
  summary: z.string().describe('A summary of the client information.'),
});
export type GenerateClientSummaryOutput = z.infer<typeof GenerateClientSummaryOutputSchema>;

export async function generateClientSummary(input: GenerateClientSummaryInput): Promise<GenerateClientSummaryOutput> {
  return generateClientSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateClientSummaryPrompt',
  input: {schema: GenerateClientSummaryInputSchema},
  output: {schema: GenerateClientSummaryOutputSchema},
  prompt: `You are dispatcher summarizing client information.

  Summarize the following notes about the client:

  Notes: {{{notes}}}
  `,
});

const generateClientSummaryFlow = ai.defineFlow(
  {
    name: 'generateClientSummaryFlow',
    inputSchema: GenerateClientSummaryInputSchema,
    outputSchema: GenerateClientSummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
