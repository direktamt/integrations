import { ContractDriftFinding } from './ContractDriftFinding';
import {
  countByClass,
  exitCodeFor,
  renderAnnotations,
  renderMarkdownSummary,
} from './ContractDriftReport';
import { DriftClass } from './DriftClass';

const finding = (
  overrides: Partial<ContractDriftFinding>,
): ContractDriftFinding => ({
  provider: 'PVOG',
  endpoint: 'GET /v3/locations/ars',
  handbookSection: '1.2',
  url: 'https://pvog.fitko.net/suchdienst/api/v3/locations/ars',
  status: 200,
  contentType: 'application/json',
  contract: 'valid',
  deprecated: false,
  driftClass: null,
  messages: [],
  attempts: 1,
  ...overrides,
});

describe('contract drift report', () => {
  it('fails the run on breaking or deprecated findings only', () => {
    expect(exitCodeFor([finding({})])).toBe(0);
    expect(exitCodeFor([finding({ driftClass: DriftClass.Additive })])).toBe(0);
    expect(exitCodeFor([finding({ driftClass: DriftClass.Cosmetic })])).toBe(0);
    expect(
      exitCodeFor([finding({ driftClass: DriftClass.InfrastructureFailure })]),
    ).toBe(0);
    expect(exitCodeFor([finding({ driftClass: DriftClass.Deprecated })])).toBe(
      1,
    );
    expect(
      exitCodeFor([finding({}), finding({ driftClass: DriftClass.Breaking })]),
    ).toBe(1);
  });

  it('renders the summary table with one row per probe and a verdict', () => {
    const markdown = renderMarkdownSummary(
      [
        finding({}),
        finding({
          provider: 'FIM',
          endpoint: 'GET /v0/leistung-steckbriefe',
          status: 404,
          contract: 'unavailable',
          driftClass: DriftClass.Breaking,
          messages: ['reference request answered HTTP 404'],
        }),
      ],
      new Date('2026-10-01T06:00:00Z'),
    );

    expect(markdown).toContain('❌ breaking drift');
    expect(markdown).toContain(
      '| Provider | Endpoint | Status | Contract | Deprecation | Finding |',
    );
    expect(markdown).toContain(
      '| PVOG | `GET /v3/locations/ars` (1.2) | 200 | valid | no | **OK** |',
    );
    expect(markdown).toContain(
      '| FIM | `GET /v0/leistung-steckbriefe` (2.2) | 404 | unavailable | no | **BREAKING** — reference request answered HTTP 404 |'.replace(
        '(2.2)',
        '(1.2)',
      ),
    );
    expect(markdown).toContain('2026-10-01T06:00:00.000Z');
  });

  it('marks an inconclusive run distinctly from drift', () => {
    const markdown = renderMarkdownSummary(
      [
        finding({
          driftClass: DriftClass.InfrastructureFailure,
          contract: 'unavailable',
          status: undefined,
        }),
      ],
      new Date(),
    );

    expect(markdown).toContain('⚠️ inconclusive (infrastructure failure)');
    expect(markdown).not.toContain('breaking drift');
    expect(
      countByClass([finding({ driftClass: DriftClass.InfrastructureFailure })]),
    ).toMatchObject({
      INFRASTRUCTURE_FAILURE: 1,
      OK: 0,
    });
  });

  it('emits GitHub annotations for actionable classes only', () => {
    const annotations = renderAnnotations([
      finding({}),
      finding({
        driftClass: DriftClass.Cosmetic,
        messages: ['HTTP 204 instead of 200'],
      }),
      finding({
        driftClass: DriftClass.Additive,
        messages: ['undeclared fields: x'],
      }),
      finding({
        driftClass: DriftClass.Breaking,
        messages: ['body is not valid JSON'],
      }),
      finding({
        driftClass: DriftClass.Deprecated,
        messages: ['upstream sent X-Pvog-Deprecated: true'],
      }),
      finding({
        driftClass: DriftClass.InfrastructureFailure,
        messages: ['transport failure'],
      }),
    ]);

    expect(annotations).toEqual([
      '::warning title=ADDITIVE PVOG GET /v3/locations/ars::undeclared fields: x',
      '::error title=BREAKING PVOG GET /v3/locations/ars::body is not valid JSON',
      '::error title=DEPRECATED PVOG GET /v3/locations/ars::upstream sent X-Pvog-Deprecated: true',
      '::warning title=INFRASTRUCTURE_FAILURE PVOG GET /v3/locations/ars::transport failure',
    ]);
  });
});
