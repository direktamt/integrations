/**
 * Manual live smoke comparison of the PVOG service-search adapters:
 *
 *   npm run verify:pvog-service-search-compat
 *
 * Runs a few safe reference queries against v7 (production default) and
 * v8beta1 (experimental), normalizes both through their adapters and
 * reports semantic differences of the public contract. Ordering and hit
 * totals may legitimately differ between the upstream search algorithms and
 * are reported, not judged; `summary` and `targetAudiences` are a documented
 * v8beta1 gap; the SET of sections differs by upstream design (the v7 search
 * view renders responsibilities as text sections, the detail view — the
 * only section source for v8beta1 hits — publishes them as organisation
 * units and adds editorial sections) and is reported, not judged. The run
 * FAILS when a service present in both results differs in title, LeiKa
 * keys, regional keys, federal states or languages, or when a section
 * present in both differs in text or links.
 */
import 'reflect-metadata';
import type { PublicServiceDescription } from '@direktamt/integrations-contracts';
import { PvogSearchClient } from '../src/integrations/pvog/PvogSearchClient';
import { ServiceSearchOptions } from '../src/integrations/pvog/model/ServiceSearchOptions';
import { PvogV7ServiceSearchProvider } from '../src/integrations/pvog/serviceSearch/v7/PvogV7ServiceSearchProvider';
import { PvogV8BetaServiceSearchProvider } from '../src/integrations/pvog/serviceSearch/v8beta1/PvogV8BetaServiceSearchProvider';

interface ReferenceQuery {
  label: string;
  regionalKey: string;
  query: string;
}

const REFERENCE_QUERIES: ReferenceQuery[] = [
  {
    label: 'Köln / Wohnsitz anmelden',
    regionalKey: '053150000000',
    query: 'Wohnsitz anmelden',
  },
  {
    label: 'Berlin / Gewerbe anmelden',
    regionalKey: '110000000000',
    query: 'Gewerbe anmelden',
  },
  {
    label: 'München / Personalausweis',
    regionalKey: '091620000000',
    query: 'Personalausweis beantragen',
  },
];

const OPTIONS: ServiceSearchOptions = {
  size: 10,
  page: 0,
  fuzzySearch: true,
  useRegionalHierarchy: true,
};

const STRICT_FIELDS: (keyof PublicServiceDescription)[] = [
  'title',
  'serviceCatalogKeys',
  'regionalKeys',
  'federalStateKeys',
  'availableLanguages',
];

type Section = PublicServiceDescription['sections'][number];

const sectionKey = (section: Section): string =>
  `${section.type}:${section.originalTitle ?? ''}`;

interface ServiceComparison {
  failures: string[];
  notes: string[];
}

/**
 * Strict fields must be identical; sections are compared by content where
 * both versions publish them, while the set difference is only noted.
 */
function compare(
  fromV7: PublicServiceDescription,
  fromV8: PublicServiceDescription,
): ServiceComparison {
  const failures: string[] = [];
  const notes: string[] = [];

  for (const field of STRICT_FIELDS) {
    if (JSON.stringify(fromV7[field]) !== JSON.stringify(fromV8[field])) {
      failures.push(
        `${field}: v7=${JSON.stringify(fromV7[field])} v8beta1=${JSON.stringify(fromV8[field])}`,
      );
    }
  }

  const sectionsV7 = new Map(fromV7.sections.map((s) => [sectionKey(s), s]));
  const sectionsV8 = new Map(fromV8.sections.map((s) => [sectionKey(s), s]));
  const onlyV7 = [...sectionsV7.keys()].filter((key) => !sectionsV8.has(key));
  const onlyV8 = [...sectionsV8.keys()].filter((key) => !sectionsV7.has(key));
  let identical = 0;

  for (const [key, sectionV7] of sectionsV7) {
    const sectionV8 = sectionsV8.get(key);

    if (!sectionV8) continue;
    const same =
      sectionV7.htmlText === sectionV8.htmlText &&
      JSON.stringify(sectionV7.links.map((l) => l.url)) ===
        JSON.stringify(sectionV8.links.map((l) => l.url));

    if (same) identical++;
    else failures.push(`section ${key}: text or links differ`);
  }
  notes.push(
    `sections: ${identical} common and identical` +
      (onlyV7.length ? `, only v7: [${onlyV7.join(', ')}]` : '') +
      (onlyV8.length ? `, only v8beta1: [${onlyV8.join(', ')}]` : ''),
  );
  const gap = [
    fromV7.summary !== undefined ? 'summary' : '',
    fromV7.targetAudiences.length ? 'targetAudiences' : '',
  ].filter(Boolean);

  if (gap.length) {
    notes.push(`v7-only fields absent in v8beta1: ${gap.join(', ')}`);
  }

  return { failures, notes };
}

async function main(): Promise<number> {
  const v7 = new PvogV7ServiceSearchProvider();
  const v8beta1 = new PvogV8BetaServiceSearchProvider(new PvogSearchClient());
  let failures = 0;

  for (const reference of REFERENCE_QUERIES) {
    console.log(`\n=== ${reference.label} (ARS ${reference.regionalKey})`);
    const [fromV7, fromV8] = await Promise.all([
      v7.searchServices(reference.regionalKey, reference.query, OPTIONS),
      v8beta1.searchServices(reference.regionalKey, reference.query, OPTIONS),
    ]);

    console.log(
      `totals: v7 ${fromV7.totalElements ?? '?'} / ${fromV7.totalPages ?? '?'} pages, v8beta1 ${fromV8.totalElements ?? '?'} / ${fromV8.totalPages ?? '?'} pages (informational)`,
    );
    const byIdV7 = new Map(fromV7.services.map((s) => [s.id ?? '', s]));
    const byIdV8 = new Map(fromV8.services.map((s) => [s.id ?? '', s]));
    const onlyV7 = [...byIdV7.keys()].filter((id) => !byIdV8.has(id));
    const onlyV8 = [...byIdV8.keys()].filter((id) => !byIdV7.has(id));
    const common = [...byIdV7.keys()].filter((id) => byIdV8.has(id));

    console.log(
      `ids: ${common.length} common, ${onlyV7.length} only v7, ${onlyV8.length} only v8beta1 (ranking differences are expected)`,
    );
    if (onlyV7.length) console.log(`  only v7: ${onlyV7.join(', ')}`);
    if (onlyV8.length) console.log(`  only v8beta1: ${onlyV8.join(', ')}`);
    const orderV7 = fromV7.services
      .map((s) => s.id ?? '')
      .filter((id) => byIdV8.has(id));
    const orderV8 = fromV8.services
      .map((s) => s.id ?? '')
      .filter((id) => byIdV7.has(id));
    console.log(
      `order of common ids identical: ${JSON.stringify(orderV7) === JSON.stringify(orderV8)}`,
    );

    for (const id of common) {
      const comparison = compare(byIdV7.get(id)!, byIdV8.get(id)!);

      if (comparison.failures.length) failures++;
      console.log(
        `  ${comparison.failures.length ? 'DIFF' : 'OK  '} ${id} — ${byIdV7.get(id)!.title ?? '(untitled)'}`,
      );
      for (const line of [...comparison.failures, ...comparison.notes]) {
        console.log(`       ${line}`);
      }
    }
  }

  console.log(
    `\nsemantic compatibility: ${failures === 0 ? 'PASS' : `FAIL (${failures} differing services)`}`,
  );

  return failures === 0 ? 0 : 1;
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error);
    process.exit(2);
  },
);
