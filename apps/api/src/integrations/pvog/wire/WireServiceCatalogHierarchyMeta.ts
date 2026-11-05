import { Expose } from 'class-transformer';
import { IsBoolean } from 'class-validator';

/**
 * PVOG wire model: match metadata of the LeiKa hierarchy search page
 * (JSON: `meta`).
 */
export class WireServiceCatalogHierarchyMeta {
  /**
   * True when the hits carry the requested LeiKa keys, false when the
   * search fell back to more specific or more general keys (or found
   * nothing). Applies to every hit of the page.
   */
  @Expose()
  @IsBoolean()
  exact!: boolean;
}
