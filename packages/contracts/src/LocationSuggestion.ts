/**
 * One autocomplete hit for the city input field.
 */
export interface LocationSuggestion {
  /**
   * Display name of the city, district or postal-code area.
   */
  name: string;

  /**
   * Search relevance score; higher = better match.
   */
  relevance: number;
}
