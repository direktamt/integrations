/**
 * Any JSON value as parsed from an upstream body. Raw provider
 * representations are typed with it instead of a domain model, because
 * their shape is the provider's contract, not DirektAmt's.
 */
export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
