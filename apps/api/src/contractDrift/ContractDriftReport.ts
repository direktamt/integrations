import { ContractDriftFinding } from './ContractDriftFinding';
import { DriftClass } from './DriftClass';

/**
 * Exit code of a verification run: breaking drift and deprecations fail the
 * run (documented policy: a deprecated endpoint in use is treated as
 * breaking); everything else, including infrastructure failures, leaves it
 * green with a visible summary.
 */
export function exitCodeFor(findings: ContractDriftFinding[]): 0 | 1 {
  return findings.some(
    (f) =>
      f.driftClass === DriftClass.Breaking ||
      f.driftClass === DriftClass.Deprecated,
  )
    ? 1
    : 0;
}

export function countByClass(
  findings: ContractDriftFinding[],
): Record<DriftClass | 'OK', number> {
  const counts = {
    OK: 0,
    [DriftClass.Breaking]: 0,
    [DriftClass.Additive]: 0,
    [DriftClass.Deprecated]: 0,
    [DriftClass.Cosmetic]: 0,
    [DriftClass.InfrastructureFailure]: 0,
  };

  for (const finding of findings) counts[finding.driftClass ?? 'OK']++;

  return counts;
}

/**
 * Markdown for the GitHub job summary: one row per probe.
 */
export function renderMarkdownSummary(
  findings: ContractDriftFinding[],
  ranAt: Date,
): string {
  const counts = countByClass(findings);
  const verdict =
    counts[DriftClass.Breaking] > 0
      ? '❌ breaking drift'
      : counts[DriftClass.Deprecated] > 0
        ? '❌ deprecated endpoint in use'
        : counts[DriftClass.InfrastructureFailure] > 0
          ? '⚠️ inconclusive (infrastructure failure)'
          : '✅ no breaking drift';
  const lines = [
    `## Upstream contract drift — ${verdict}`,
    '',
    `Run: ${ranAt.toISOString()} · ${findings.length} probes · ` +
      Object.entries(counts)
        .filter(([, n]) => n > 0)
        .map(([k, n]) => `${k}: ${n}`)
        .join(' · '),
    '',
    '| Provider | Endpoint | Status | Contract | Deprecation | Finding |',
    '| --- | --- | --- | --- | --- | --- |',
    ...findings.map(
      (f) =>
        `| ${f.provider} | \`${f.endpoint}\` (${f.handbookSection}) | ${f.status ?? '—'} | ${f.contract} | ${f.deprecated ? '**yes**' : 'no'} | ${renderFinding(f)} |`,
    ),
    '',
    'INFRASTRUCTURE_FAILURE means the runner got no conclusive answer (network, timeout, upstream 5xx) and is not contract drift. Reference requests are read-only and use public administrative identifiers; see `apps/api/docs/INTEGRATIONS.md`, Verification procedure.',
    '',
  ];

  return lines.join('\n');
}

/**
 * Plain-text version for the console.
 */
export function renderConsoleSummary(findings: ContractDriftFinding[]): string {
  return findings
    .map(
      (f) =>
        `${(f.driftClass ?? 'OK').padEnd(22)} ${f.provider.padEnd(4)} ${f.endpoint.padEnd(58)} ${String(f.status ?? '—').padEnd(4)} ${f.contract.padEnd(13)} dep=${f.deprecated ? 'yes' : 'no '}` +
        (f.messages.length
          ? `\n${f.messages.map((m) => `    - ${m}`).join('\n')}`
          : ''),
    )
    .join('\n');
}

/**
 * GitHub Actions workflow commands so that findings surface as annotations.
 */
export function renderAnnotations(findings: ContractDriftFinding[]): string[] {
  return findings.flatMap((f) => {
    const title = `${f.provider} ${f.endpoint}`;
    const detail = f.messages.join('; ').replace(/\n/g, ' ');

    switch (f.driftClass) {
      case DriftClass.Breaking:
      case DriftClass.Deprecated:
        return [`::error title=${f.driftClass} ${title}::${detail}`];
      case DriftClass.InfrastructureFailure:
      case DriftClass.Additive:
        return [`::warning title=${f.driftClass} ${title}::${detail}`];
      default:
        return [];
    }
  });
}

function renderFinding(finding: ContractDriftFinding): string {
  const label = finding.driftClass ?? 'OK';
  const detail = finding.messages
    .map((m) => m.replace(/\|/g, '\\|').replace(/\n/g, ' '))
    .join('; ');

  return detail ? `**${label}** — ${detail}` : `**${label}**`;
}
