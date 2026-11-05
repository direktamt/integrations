import { z } from 'zod';
import { defineTool, type ToolDefinition } from './ToolDefinition.js';
import { ToolInputFields } from './ToolInputFields.js';

/**
 * Online-application services of a territory and their authorities.
 */
export const ONLINE_SERVICE_TOOLS: readonly ToolDefinition[] = [
  defineTool({
    name: 'listOnlineServices',
    title: 'List online services of a territory',
    endpoint: 'GET /online-services',
    description:
      'Lists the online-application services published for a territory: name, description, the LeiKa service catalog keys they cover and their entry links. Filter by serviceCatalogKeys (from a service description) to get the online services of specific services; without a filter the list covers every service of the territory and can be long. The regionalKey comes from resolveLocation. An empty list means no online service is published.',
    inputSchema: z.strictObject({
      regionalKey: ToolInputFields.regionalKey(),
      serviceCatalogKeys: z
        .array(ToolInputFields.serviceCatalogKey())
        .optional()
        .describe(
          '14-digit LeiKa service catalog keys to filter by, taken from serviceCatalogKeys of a service description.',
        ),
    }),
    invoke: (client, input, options) =>
      client.onlineServices.list(input, options),
  }),

  defineTool({
    name: 'listOnlineServiceAuthorities',
    title: 'List the authorities responsible for an online service',
    endpoint: 'GET /online-services/{id}/authorities',
    description:
      'Lists the authorities responsible for one online service, each with all its roles, addresses, contact channels and websites. The id comes from listOnlineServices or from the onlineServices of getServiceContext.',
    inputSchema: z.strictObject({
      id: z
        .string()
        .min(1)
        .describe(
          'PVOG id of the online service, e.g. "L100002.OD.121797650"; get it from listOnlineServices.',
        ),
    }),
    invoke: (client, input, options) =>
      client.authorities.listForOnlineService(input, options),
  }),
];
