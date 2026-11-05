import { z } from 'zod';
import { defineTool, type ToolDefinition } from './ToolDefinition.js';
import { ToolInputFields } from './ToolInputFields.js';

/**
 * The federal LeiKa service catalog and its master texts (FIM).
 */
export const CATALOG_TOOLS: readonly ToolDefinition[] = [
  defineTool({
    name: 'searchCatalog',
    title: 'Search the federal service catalog',
    endpoint: 'GET /catalog',
    description:
      'Full-text search in the federal LeiKa service catalog (FIM), independent of any territory. Returns catalog entries (14-digit serviceCatalogKey, titles, editorialOfficeId, serviceId) and paging counts. Use it to find the canonical key of a service; editorialOfficeId and serviceId of an entry lead to getMasterText.',
    inputSchema: z.strictObject({
      term: z
        .string()
        .min(1)
        .describe('German search term, e.g. "Aufenthaltserlaubnis".'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(200)
        .optional()
        .describe('Maximum number of entries, 1 to 200.'),
      offset: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('Number of entries to skip.'),
    }),
    invoke: (client, input, options) => client.catalog.search(input, options),
  }),

  defineTool({
    name: 'getCatalogEntry',
    title: 'Get a federal catalog entry',
    endpoint: 'GET /catalog/{serviceCatalogKey}',
    description:
      'Returns one federal LeiKa catalog entry by its 14-digit serviceCatalogKey, with official and citizen-facing names, legal basis, and the editorialOfficeId and serviceId that getMasterText needs. Answers notFound for a key the catalog does not know.',
    inputSchema: z.strictObject({
      serviceCatalogKey: ToolInputFields.serviceCatalogKey(),
    }),
    invoke: (client, input, options) => client.catalog.get(input, options),
  }),

  defineTool({
    name: 'getMasterText',
    title: 'Get a federal master text',
    endpoint: 'GET /master-texts/{editorialOfficeId}/{serviceId}',
    description:
      'Returns the federal master text (FIM, parsed XZuFi) of a service: the federal reference description that local service descriptions build on. editorialOfficeId and serviceId come from a catalog entry (getCatalogEntry or searchCatalog). The structure is passed through as published and may change upstream. Answers notFound when no master text is published.',
    inputSchema: z.strictObject({
      editorialOfficeId: z
        .string()
        .min(1)
        .describe('Editorial office id from a catalog entry, e.g. "B100019".'),
      serviceId: z
        .string()
        .min(1)
        .describe(
          'Service id within the editorial office, from the same catalog entry; not a PVOG service id.',
        ),
      source: z
        .string()
        .min(1)
        .optional()
        .describe(
          'Upstream text source variant; the API uses "primary" when omitted.',
        ),
    }),
    invoke: (client, input, options) => client.masterTexts.get(input, options),
  }),
];
