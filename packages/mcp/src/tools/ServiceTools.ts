import { z } from 'zod';
import { defineTool, type ToolDefinition } from './ToolDefinition.js';
import { ToolInputFields } from './ToolInputFields.js';

/**
 * Public services within a territory: search, one description, the
 * responsible authorities and the composed context.
 */
export const SERVICE_TOOLS: readonly ToolDefinition[] = [
  defineTool({
    name: 'searchServices',
    title: 'Search public services in a territory',
    endpoint: 'GET /services',
    description:
      'Searches the public services (administrative procedures) published for a territory with a plain-language query; the data is German, so German queries such as "Aufenthaltstitel verlängern" or "Wohnsitz anmelden" match best. Returns one page of service descriptions (id, LeiKa service catalog keys, title, summary, content sections) in the ranking of the official search, plus totalElements and totalPages. The regionalKey comes from resolveLocation; pass a returned id to getServiceContext, getService or listServiceAuthorities.',
    inputSchema: z.strictObject({
      regionalKey: ToolInputFields.regionalKey(),
      query: z
        .string()
        .min(1)
        .describe('Plain-language description of the task, ideally German.'),
      size: z
        .number()
        .int()
        .min(5)
        .max(9999)
        .optional()
        .describe('Page size, 5 to 9999; the API defaults to 10.'),
      page: z
        .number()
        .int()
        .min(0)
        .max(100)
        .optional()
        .describe('Zero-based page index, 0 to 100; the API defaults to 0.'),
      fuzzySearch: z
        .boolean()
        .optional()
        .describe('Tolerate typos in the query; the API defaults to true.'),
      useRegionalHierarchy: ToolInputFields.useRegionalHierarchy(),
      lifeSituationCodes: z
        .array(z.string().min(1))
        .optional()
        .describe('Life-situation codes to filter by.'),
      validDate: z
        .string()
        .min(1)
        .optional()
        .describe(
          'Only descriptions valid at this date, ISO 8601 (yyyy-MM-dd).',
        ),
    }),
    invoke: (client, input, options) => client.services.search(input, options),
  }),

  defineTool({
    name: 'getService',
    title: 'Get one service description',
    endpoint: 'GET /services/{id}',
    description:
      'Returns one service description for a territory with all content sections as published by the authority (requirements, required documents, fees, deadlines, procedure, legal basis and more; section text is HTML). The id comes from searchServices, the regionalKey from resolveLocation. Use getServiceContext instead when authorities, online services or federal master texts are needed as well. Answers notFound when the service does not exist in the territory.',
    inputSchema: z.strictObject({
      id: ToolInputFields.serviceId(),
      regionalKey: ToolInputFields.regionalKey(),
      useRegionalHierarchy: ToolInputFields.useRegionalHierarchy(),
    }),
    invoke: (client, input, options) => client.services.get(input, options),
  }),

  defineTool({
    name: 'listServiceAuthorities',
    title: 'List the authorities responsible for a service',
    endpoint: 'GET /services/{id}/authorities',
    description:
      'Lists the authorities responsible for a service in a territory, each with its role (responsible authority, contact point, ...), addresses, contact channels and websites. The id comes from searchServices, the regionalKey from resolveLocation. An empty list means no authority is published.',
    inputSchema: z.strictObject({
      id: ToolInputFields.serviceId(),
      regionalKey: ToolInputFields.regionalKey(),
      useRegionalHierarchy: ToolInputFields.useRegionalHierarchy(),
    }),
    invoke: (client, input, options) =>
      client.authorities.listForService(input, options),
  }),

  defineTool({
    name: 'getServiceContext',
    title: 'Get everything about one service',
    endpoint: 'GET /services/{id}/context',
    description:
      'Returns everything known about one service in a territory in a single call: the service description with all sections, the responsible authorities with addresses and contacts, the online-application links, the federal LeiKa catalog entries and the federal master texts. A part whose source failed comes back as an empty list and is named in status.unavailableParts; an empty part not named there means nothing is published. The id comes from searchServices, the regionalKey from resolveLocation. Use it to present one procedure completely; answers notFound when the service does not exist in the territory.',
    inputSchema: z.strictObject({
      id: ToolInputFields.serviceId(),
      regionalKey: ToolInputFields.regionalKey(),
      useRegionalHierarchy: ToolInputFields.useRegionalHierarchy(),
    }),
    invoke: (client, input, options) =>
      client.services.getContext(input, options),
  }),
];
