
'use server';
/**
 * @fileOverview An AI flow to suggest an optimized route for a list of stops.
 *
 * - optimizeRoute - A function that suggests an optimized delivery route.
 * - OptimizeRouteInput - The input type for the optimizeRoute function.
 * - OptimizeRouteOutput - The return type for the optimizeRoute function.
 * - OptimizeRouteStopInput - The type for individual stops in the input.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const OptimizeRouteStopInputSchema = z.object({
  id: z.string().describe("Unique identifier for the stop (e.g., parada_id, envio_id, or a special ID for company pickup)."),
  label: z.string().describe("A human-readable label for the stop (e.g., client name or 'Retiro Empresa')."),
  lat: z.number().describe("Latitude of the stop."),
  lng: z.number().describe("Longitude of the stop."),
  type: z.string().optional().describe("Type of stop, e.g., 'pickup' or 'delivery', to help AI understand context."),
});
export type OptimizeRouteStopInput = z.infer<typeof OptimizeRouteStopInputSchema>;

const OptimizeRouteInputSchema = z.object({
  stops: z.array(OptimizeRouteStopInputSchema)
    .min(2, "At least two stops are required for route optimization.")
    .describe("An array of stops to be routed. The AI should consider the first stop as the starting point if it's a pickup location."),
  // Consider adding vehicle type, delivery windows, traffic considerations for more advanced prompts later
});
export type OptimizeRouteInput = z.infer<typeof OptimizeRouteInputSchema>;

const OptimizeRouteOutputSchema = z.object({
  optimized_stop_ids: z.array(z.string()).describe("An array of stop IDs in the suggested optimal order."),
  notes: z.string().optional().describe("Any notes, estimated distance/time, or reasoning from the AI about the suggested route."),
});
export type OptimizeRouteOutput = z.infer<typeof OptimizeRouteOutputSchema>;

export async function optimizeRoute(input: OptimizeRouteInput): Promise<OptimizeRouteOutput> {
  return optimizeRouteFlow(input);
}

const prompt = ai.definePrompt({
  name: 'optimizeRoutePrompt',
  input: { schema: OptimizeRouteInputSchema },
  output: { schema: OptimizeRouteOutputSchema },
  prompt: `You are a route optimization expert for a delivery service in Mar del Plata, Argentina.
Given the following list of stops, each with an ID, a label, latitude, and longitude, and potentially a type ('pickup' or 'delivery'):

Stops:
{{#each stops}}
- ID: {{id}}, Label: "{{label}}", Coordinates: ({{lat}}, {{lng}}){{#if type}}, Type: {{type}}{{/if}}
{{/each}}

Your task is to determine an efficient (ideally the shortest) route that visits all these stops.
If the first stop is explicitly marked as a 'pickup' or seems like a depot/company location, it should be the starting point of the route.
Otherwise, determine the best starting point among the stops provided to minimize overall travel.
The output should be a list of stop IDs in the suggested optimized sequence.

Please provide the result as a JSON object adhering to the OptimizeRouteOutputSchema.
Include the 'optimized_stop_ids' array. You can optionally include 'notes' with a brief explanation or total estimated distance if you can infer it (assume urban driving conditions in Mar del Plata).
Prioritize minimizing travel distance/time.
`,
});

const optimizeRouteFlow = ai.defineFlow(
  {
    name: 'optimizeRouteFlow',
    inputSchema: OptimizeRouteInputSchema,
    outputSchema: OptimizeRouteOutputSchema,
  },
  async (input: OptimizeRouteInput) => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error("AI did not return an output for route optimization.");
    }
    // Ensure the output contains all original stop IDs, just reordered.
    // This is a basic check; more sophisticated validation might be needed.
    const originalIds = new Set(input.stops.map(s => s.id));
    const optimizedIds = new Set(output.optimized_stop_ids);
    if (originalIds.size !== optimizedIds.size || !Array.from(originalIds).every(id => optimizedIds.has(id))) {
        console.warn("AI route optimization output is missing some original stop IDs or has duplicates.", {original: input.stops, optimized: output.optimized_stop_ids});
        // Potentially throw an error or try to return the original order as a fallback if critical
        // For now, we'll let it pass but log a warning.
    }

    return output;
  }
);
