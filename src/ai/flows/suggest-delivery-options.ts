// use server'

/**
 * @fileOverview A delivery options suggestion AI agent.
 *
 * - suggestDeliveryOptions - A function that handles the delivery options suggestion process.
 * - SuggestDeliveryOptionsInput - The input type for the suggestDeliveryOptions function.
 * - SuggestDeliveryOptionsOutput - The return type for the suggestDeliveryOptions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestDeliveryOptionsInputSchema = z.object({
  clientLocation: z.string().describe('The location of the client.'),
  packageSize: z.string().describe('The size of the package (small, medium, large).'),
  packageWeight: z.number().describe('The weight of the package in kilograms.'),
});
export type SuggestDeliveryOptionsInput = z.infer<typeof SuggestDeliveryOptionsInputSchema>;

const SuggestDeliveryOptionsOutputSchema = z.object({
  suggestedOptions: z
    .array(z.string())
    .describe('An array of suggested delivery options based on the input data.'),
  reasoning: z
    .string()
    .describe('The reasoning behind the suggested delivery options.'),
});
export type SuggestDeliveryOptionsOutput = z.infer<typeof SuggestDeliveryOptionsOutputSchema>;

export async function suggestDeliveryOptions(input: SuggestDeliveryOptionsInput): Promise<SuggestDeliveryOptionsOutput> {
  return suggestDeliveryOptionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestDeliveryOptionsPrompt',
  input: {schema: SuggestDeliveryOptionsInputSchema},
  output: {schema: SuggestDeliveryOptionsOutputSchema},
  prompt: `You are a delivery expert. Based on the client's location, package size, and package weight, suggest suitable delivery options.

Client Location: {{{clientLocation}}}
Package Size: {{{packageSize}}}
Package Weight: {{{packageWeight}}} kg

Consider factors like cost, speed, and reliability when suggesting options. Provide a brief reasoning for each suggestion.

Format your response as a JSON object with 'suggestedOptions' (an array of delivery options) and 'reasoning' (an explanation of why these options are suitable).`,
});

const suggestDeliveryOptionsFlow = ai.defineFlow(
  {
    name: 'suggestDeliveryOptionsFlow',
    inputSchema: SuggestDeliveryOptionsInputSchema,
    outputSchema: SuggestDeliveryOptionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
