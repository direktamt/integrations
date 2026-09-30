import { Expose, Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { inspectWireShape } from './WireShapeInspector';

class WireChild {
  @Expose({ name: 'uri' })
  @IsString()
  url!: string;

  @Expose()
  @IsOptional()
  @IsString()
  title?: string;
}

class WireParent {
  @Expose()
  @IsString()
  id!: string;

  @Expose({ name: 'leikakeys' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keys?: string[];

  @Expose()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => WireChild)
  links?: WireChild[];

  @Expose()
  facades?: unknown;
}

describe('inspectWireShape', () => {
  it('accepts a payload that matches the model', () => {
    expect(
      inspectWireShape(
        WireParent,
        {
          id: 'a',
          leikakeys: ['1'],
          links: [{ uri: 'https://x', title: 't' }],
        },
        false,
      ),
    ).toEqual({ violations: [], unknownFields: [] });
  });

  it('reports a missing required field', () => {
    const { violations } = inspectWireShape(
      WireParent,
      { leikakeys: [] },
      false,
    );

    expect(violations).toEqual(['id: id must be a string']);
  });

  it('reports a wrong type, also inside nested models, by wire property name', () => {
    const { violations } = inspectWireShape(
      WireParent,
      { id: 7, leikakeys: 'not-a-list', links: [{ uri: 5 }] },
      false,
    );

    expect(violations).toEqual(
      expect.arrayContaining([
        'id: id must be a string',
        'keys: keys must be an array',
        'links.0.url: url must be a string',
      ]),
    );
  });

  it('reports undeclared fields at every level as additive', () => {
    const { violations, unknownFields } = inspectWireShape(
      WireParent,
      {
        id: 'a',
        brandNew: 1,
        links: [{ uri: 'https://x', dynamicParameters: [] }],
        facades: { anything: true },
      },
      false,
    );

    expect(violations).toEqual([]);
    expect(unknownFields).toEqual(['brandNew', 'links[].dynamicParameters']);
  });

  it('inspects a sample of array items and de-duplicates unknown fields', () => {
    const { violations, unknownFields } = inspectWireShape(
      WireParent,
      [
        { id: 'a', extra: 1 },
        { id: 'b', extra: 2 },
        { id: 'c' },
        { extra: 'not inspected beyond the sample' },
      ],
      true,
    );

    expect(violations).toEqual([]);
    expect(unknownFields).toEqual(['[].extra']);
  });

  it('rejects the wrong top-level shape', () => {
    expect(inspectWireShape(WireParent, { id: 'a' }, true).violations).toEqual([
      'expected a JSON array at the top level, got object',
    ]);
    expect(inspectWireShape(WireParent, [], false).violations).toEqual([
      'value: expected a JSON object, got an array',
    ]);
    expect(inspectWireShape(WireParent, [null], true).violations).toEqual([
      '[0]: expected a JSON object, got null',
    ]);
  });
});
