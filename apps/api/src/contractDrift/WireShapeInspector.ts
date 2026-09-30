import {
  ClassConstructor,
  instanceToPlain,
  plainToInstance,
} from 'class-transformer';
import { validateSync, ValidationError } from 'class-validator';

export interface WireShapeInspection {
  /**
   * class-validator violations: missing required fields, wrong types.
   */
  violations: string[];

  /**
   * JSON keys the wire model does not declare (recursively, following the
   * nested wire models), with array indices normalized to `[]` and
   * de-duplicated; additive drift.
   */
  unknownFields: string[];
}

/**
 * Number of array items inspected per level; enough to see a shape,
 * bounded so that large pages stay cheap.
 */
const ITEM_SAMPLE_SIZE = 3;

/**
 * Transforms and validates a payload against a wire model the same way
 * BaseHttpClient does, and additionally reports undeclared JSON keys by
 * comparing the payload with the plain form of the transformed instance.
 */
export function inspectWireShape(
  model: ClassConstructor<object>,
  payload: unknown,
  expectsArray: boolean,
): WireShapeInspection {
  if (expectsArray) {
    if (!Array.isArray(payload)) {
      return {
        violations: [
          `expected a JSON array at the top level, got ${describe(payload)}`,
        ],
        unknownFields: [],
      };
    }

    return merge(
      payload
        .slice(0, ITEM_SAMPLE_SIZE)
        .map((item, index) => inspectObject(model, item, `[${index}]`)),
    );
  }

  return inspectObject(model, payload, '');
}

function inspectObject(
  model: ClassConstructor<object>,
  payload: unknown,
  path: string,
): WireShapeInspection {
  if (
    payload === null ||
    typeof payload !== 'object' ||
    Array.isArray(payload)
  ) {
    return {
      violations: [
        `${path || 'value'}: expected a JSON object, got ${describe(payload)}`,
      ],
      unknownFields: [],
    };
  }

  const instance = plainToInstance(model, payload, {
    excludeExtraneousValues: true,
  });
  const errors = validateSync(instance, { forbidUnknownValues: false });
  const known = instanceToPlain(instance) as Record<string, unknown>;

  return {
    violations: flatten(errors, path),
    unknownFields: [
      ...new Set(unknownKeys(payload, known, path).map(normalizeIndices)),
    ],
  };
}

/**
 * Keys present in the payload but absent from the plain form of the
 * transformed instance, i.e. keys no `@Expose` declares. Nested objects and
 * arrays are compared pairwise.
 */
function unknownKeys(payload: unknown, known: unknown, path: string): string[] {
  if (Array.isArray(payload)) {
    if (!Array.isArray(known)) return [];

    return payload
      .slice(0, ITEM_SAMPLE_SIZE)
      .flatMap((item, index) =>
        unknownKeys(item, known[index], `${path}[${index}]`),
      );
  }

  if (payload === null || typeof payload !== 'object') return [];
  if (known === null || typeof known !== 'object' || Array.isArray(known)) {
    return [];
  }

  const knownRecord = known as Record<string, unknown>;

  return Object.entries(payload as Record<string, unknown>).flatMap(
    ([key, value]) => {
      const childPath = path ? `${path}.${key}` : key;

      if (!(key in knownRecord)) return [childPath];

      return unknownKeys(value, knownRecord[key], childPath);
    },
  );
}

/**
 * `content[0].teaser` and `content[2].teaser` are the same finding.
 */
export function normalizeIndices(path: string): string {
  return path.replace(/\[\d+\]/g, '[]');
}

function flatten(errors: ValidationError[], parentPath: string): string[] {
  return errors.flatMap((error) => {
    const path = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;
    const own = Object.values(error.constraints ?? {}).map(
      (constraint) => `${path}: ${constraint}`,
    );

    return [...own, ...flatten(error.children ?? [], path)];
  });
}

function merge(inspections: WireShapeInspection[]): WireShapeInspection {
  return {
    violations: inspections.flatMap((i) => i.violations),
    unknownFields: [...new Set(inspections.flatMap((i) => i.unknownFields))],
  };
}

function describe(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'an array';

  return typeof value;
}
