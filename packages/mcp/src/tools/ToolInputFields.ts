import { z } from 'zod';

/**
 * Argument fields shared by several tools, described once so that every
 * tool tells a model the same thing about the same identifier.
 */
export const ToolInputFields = {
  regionalKey: () =>
    z
      .string()
      .min(1)
      .describe(
        '12-digit regional key (ARS) of the territory, e.g. "053140000000" for Bonn; get it from resolveLocation.',
      ),

  serviceId: () =>
    z
      .string()
      .min(1)
      .describe(
        'PVOG id of the service description, e.g. "L100002.LB.121407320"; get it from searchServices.',
      ),

  serviceCatalogKey: () =>
    z
      .string()
      .min(1)
      .describe(
        '14-digit LeiKa service catalog key, e.g. "99115005104000"; found in serviceCatalogKeys of a service description or online service, or in searchCatalog results.',
      ),

  useRegionalHierarchy: () =>
    z
      .boolean()
      .optional()
      .describe(
        'Include data published for parent territories (federal state, federal level); the API defaults to true.',
      ),
};
