export type QueryScalar = string | number | boolean | Date;

export type QueryValue =
  QueryScalar | ReadonlyArray<QueryScalar> | null | undefined;

export type QueryParams = Record<string, QueryValue>;

/**
 * Constraint for request objects: every property must be serializable as a
 * query value. Expressed as a mapped type so that plain interfaces qualify.
 */
export type QueryShape<Q> = { [K in keyof Q]: QueryValue };

/**
 * The one place that turns request objects into a query string. `undefined`
 * and `null` are omitted; `false` and `0` are sent literally; arrays become
 * repeated keys; dates are sent as ISO 8601 timestamps.
 */
export function serializeQuery<Q extends QueryShape<Q>>(params: Q): string {
  const search = new URLSearchParams();

  for (const key of Object.keys(params) as (keyof Q & string)[]) {
    const value: QueryValue = params[key];

    if (value === undefined || value === null) continue;

    if (Array.isArray(value)) {
      for (const item of value as ReadonlyArray<QueryScalar>) {
        search.append(key, scalarToString(item));
      }
    } else {
      search.append(key, scalarToString(value as QueryScalar));
    }
  }

  return search.toString();
}

function scalarToString(value: QueryScalar): string {
  return value instanceof Date ? value.toISOString() : String(value);
}
