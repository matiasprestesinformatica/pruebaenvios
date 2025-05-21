
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
});
export type OptimizeRouteInput = z.infer<typeof OptimizeRouteInputSchema>;

const OptimizeRouteOutputSchema = z.object({
  optimized_stop_ids: z.array(z.string()).describe("An array of stop IDs in the suggested optimal order."),
  notes: z.string().optional().describe("Any notes or reasoning from the AI about the suggested route, potentially including estimated travel time."),
  estimated_total_distance_km: z.number().optional().describe("An estimated total travel distance for the optimized route in kilometers, if calculable by the AI."),
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

Your task is to determine an efficient route that visits all these stops.
Your **principal prioridad absoluta** es minimizar la distancia total recorrida, encontrando la ruta **más corta y directa** posible. Evita al máximo rodeos innecesarios o rutas que impliquen retroceder, incluso si esto implica un ligero cambio en el orden que podría parecer lógico por proximidad agrupada inicialmente.

Si la primera parada está marcada explícitamente como 'pickup' o parece un depósito/ubicación de la empresa (normalmente la primera en la lista si es tipo 'pickup'), debe ser el punto de inicio de la ruta. De lo contrario, la IA debe **analizar las ubicaciones de todas las paradas para elegir el punto de inicio que resulte en la menor distancia total y, secundariamente, que minimice la cantidad de giros complejos para el inicio de la ruta.**

Si tienes conocimiento general sobre la estructura vial de Mar del Plata, **intenta priorizar el uso de calles o avenidas principales para el tránsito entre zonas distantes**, siempre y cuando esto no aumente significativamente la distancia total en comparación con rutas más directas por calles secundarias.

Por favor, proporciona el resultado como un objeto JSON adhiriéndote estrictamente al \`OptimizeRouteOutputSchema\`. Incluye el array \`optimized_stop_ids\`.
Intenta también calcular e incluir \`estimated_total_distance_km\` con la distancia total estimada en kilómetros. **Si es posible, incluye una estimación del tiempo total de viaje (ej. 'Tiempo estimado: X horas Y minutos') dentro del campo \`notes\`.**

Prioriza minimizar la distancia/tiempo de viaje. Asume condiciones de conducción urbana en Mar del Plata.
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
    
    const originalIds = new Set(input.stops.map(s => s.id));
    const optimizedIds = new Set(output.optimized_stop_ids);

    if (originalIds.size !== optimizedIds.size || !Array.from(originalIds).every(id => optimizedIds.has(id))) {
        console.warn(
            "AI route optimization output mismatch: The number of stops or the stop IDs in the optimized route do not perfectly match the original input. This might indicate the AI omitted or duplicated stops.", 
            { 
                originalStopCount: input.stops.length,
                optimizedStopCount: output.optimized_stop_ids.length,
                originalStopIds: Array.from(originalIds),
                optimizedStopIdsFromAI: output.optimized_stop_ids 
            }
        );
    }

    return output;
  }
);
