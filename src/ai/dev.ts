
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-client-summary.ts';
import '@/ai/flows/suggest-delivery-options.ts';
import '@/ai/flows/optimize-route-flow.ts'; // Added import for the new flow
