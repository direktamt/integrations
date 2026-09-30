/**
 * Automated upstream contract-drift verification:
 *
 *   npm run verify:contracts
 *
 * Fires one read-only reference request per implemented upstream endpoint
 * (see src/contractDrift/UpstreamProbeCatalog.ts), checks status, JSON
 * content, wire-model transformation and validation, deprecation headers,
 * redirects and pagination, and classifies every finding as BREAKING,
 * ADDITIVE, DEPRECATED, COSMETIC or INFRASTRUCTURE_FAILURE. Breaking drift
 * and deprecated endpoints fail the run; an infrastructure failure is
 * reported as inconclusive and never as drift. Run weekly by
 * .github/workflows/contract-drift.yml, never as part of the normal CI.
 */
import 'reflect-metadata';
import { appendFileSync } from 'node:fs';
import {
  exitCodeFor,
  renderAnnotations,
  renderConsoleSummary,
  renderMarkdownSummary,
} from '../src/contractDrift/ContractDriftReport';
import { ContractDriftVerifier } from '../src/contractDrift/ContractDriftVerifier';
import { ContractDriftFinding } from '../src/contractDrift/ContractDriftFinding';
import { buildUpstreamProbes } from '../src/contractDrift/UpstreamProbeCatalog';

async function main(): Promise<number> {
  const verifier = new ContractDriftVerifier({
    maxAttempts: 3,
    timeoutMs: 20_000,
    retryDelayMs: 3_000,
  });
  const findings: ContractDriftFinding[] = [];

  // Sequential on purpose: a handful of small requests, no load on the
  // government APIs.
  for (const probe of buildUpstreamProbes()) {
    findings.push(await verifier.verify(probe));
  }

  console.log(renderConsoleSummary(findings));
  for (const annotation of renderAnnotations(findings)) {
    console.log(annotation);
  }

  const markdown = renderMarkdownSummary(findings, new Date());

  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
  } else {
    console.log(`\n${markdown}`);
  }

  return exitCodeFor(findings);
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(error);
    process.exit(2);
  },
);
