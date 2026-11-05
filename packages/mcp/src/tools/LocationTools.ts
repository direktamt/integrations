import { z } from 'zod';
import { defineTool, type ToolDefinition } from './ToolDefinition.js';
import { ToolInputFields } from './ToolInputFields.js';

/**
 * Territories: autocomplete, resolution to regional keys, reverse lookup.
 */
export const LOCATION_TOOLS: readonly ToolDefinition[] = [
  defineTool({
    name: 'suggestLocations',
    title: 'Suggest place names',
    endpoint: 'GET /locations/suggestions',
    description:
      'Autocomplete for German place names: returns matching city, district or postal-code area names, each with a relevance score (higher is better). Use it to turn a partial or misspelled place into an exact name. It returns no regional key; pass the chosen name to resolveLocation to get one.',
    inputSchema: z.strictObject({
      query: z
        .string()
        .min(1)
        .describe('Partial city name or postal code, e.g. "Bon" or "531".'),
    }),
    invoke: (client, input, options) =>
      client.locations.suggest(input, options),
  }),

  defineTool({
    name: 'resolveLocation',
    title: 'Resolve a place to regional keys',
    endpoint: 'GET /locations',
    description:
      'Resolves a German city name or postal code to territories, each with its 12-digit regional key (ARS), federal state key and name. Call it first: every service, authority and online-service tool needs a regional key. Provide cityName, postalCode or both; one input can match several territories.',
    inputSchema: z.strictObject({
      cityName: z
        .string()
        .min(1)
        .optional()
        .describe('Full city name, e.g. "Bonn".'),
      postalCode: z
        .string()
        .min(1)
        .optional()
        .describe('German postal code, e.g. "53111".'),
    }),
    invoke: (client, input, options) =>
      client.locations.resolve(input, options),
  }),

  defineTool({
    name: 'getLocation',
    title: 'Get a territory by regional key',
    endpoint: 'GET /locations/{regionalKey}',
    description:
      'Returns the territory (name, federal state key) of a known 12-digit regional key. Use it to check or label a regional key; answers notFound for an unknown key.',
    inputSchema: z.strictObject({
      regionalKey: ToolInputFields.regionalKey(),
    }),
    invoke: (client, input, options) => client.locations.get(input, options),
  }),
];
