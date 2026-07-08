#!/usr/bin/env node

/**
 * KTS E2E Regression Summary Generator
 *
 * Reads Playwright JSON results and produces a concise regression report.
 * Outputs: stdout text summary + reports/summary.md
 *
 * Usage: node scripts/summary.mjs [--json reports/json/results.json] [--out reports/summary.md]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- CLI args ---
const args = process.argv.slice(2);
function getArg(name, fallback) {
  const idx = args.indexOf(name);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
}

const jsonPath = path.resolve(__dirname, getArg('--json', '../reports/json/results.json'));
const outPath = path.resolve(__dirname, getArg('--out', '../reports/summary.md'));

// --- Load results ---
if (!fs.existsSync(jsonPath)) {
  console.error(`[summary] Results file not found: ${jsonPath}`);
  console.error('[summary] Run tests first: npm test');
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
const { suites, stats, startTime, endTime } = raw;

// --- Aggregate stats ---
const total = stats.expected + stats.unexpected + stats.flaky + stats.skipped;
const passed = stats.expected;
const failed = stats.unexpected;
const flaky = stats.flaky;
const skipped = stats.skipped;
const durationMs = stats.duration;
const durationSec = (durationMs / 1000).toFixed(1);
const durationMin = (durationMs / 60000).toFixed(1);

const isCI = !!process.env.CI;
const timestamp = new Date().toISOString();
const status = failed === 0 ? 'PASS' : 'FAIL';

// --- Parse suite breakdown ---
function parseSuites(suiteList, parentFile = '') {
  const rows = [];
  for (const suite of suiteList) {
    const file = suite.file || parentFile;
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        for (const result of test.results || []) {
          rows.push({
            suite: file,
            title: spec.title,
            tags: spec.tags || [],
            status: result.status,
            duration: result.duration || 0,
            retry: result.retry || 0,
            error: result.error ? result.error.message : null,
          });
        }
      }
    }
    // Recurse into nested suites
    if (suite.suites && suite.suites.length > 0) {
      rows.push(...parseSuites(suite.suites, file));
    }
  }
  return rows;
}

const allResults = parseSuites(suites || []);

// Group by suite file
const bySuite = {};
for (const r of allResults) {
  const suiteName = path.basename(r.suite, '.spec.ts');
  if (!bySuite[suiteName]) {
    bySuite[suiteName] = { passed: 0, failed: 0, skipped: 0, flaky: 0, total: 0, duration: 0 };
  }
  bySuite[suiteName].total++;
  bySuite[suiteName].duration += r.duration;
  if (r.status === 'expected' || r.status === 'passed') bySuite[suiteName].passed++;
  else if (r.status === 'unexpected' || r.status === 'failed') bySuite[suiteName].failed++;
  else if (r.status === 'skipped') bySuite[suiteName].skipped++;
  else if (r.status === 'flaky') bySuite[suiteName].flaky++;
}

// --- Build Markdown ---
const lines = [];
lines.push(`# KTS E2E Regression Report`);
lines.push('');
lines.push(`| Field | Value |`);
lines.push(`|-------|-------|`);
lines.push(`| **Status** | ${status === 'PASS' ? 'PASS' : 'FAIL'} |`);
lines.push(`| **Timestamp** | ${timestamp} |`);
lines.push(`| **Environment** | ${isCI ? 'CI' : 'Local'} |`);
lines.push(`| **Duration** | ${durationMin}m (${durationSec}s) |`);
lines.push(`| **Total Tests** | ${total} |`);
lines.push(`| **Passed** | ${passed} |`);
lines.push(`| **Failed** | ${failed} |`);
lines.push(`| **Flaky** | ${flaky} |`);
lines.push(`| **Skipped** | ${skipped} |`);
lines.push('');

lines.push(`## Suite Breakdown`);
lines.push('');
lines.push(`| Suite | Passed | Failed | Flaky | Skipped | Duration |`);
lines.push(`|-------|--------|--------|-------|---------|----------|`);

const sortedSuites = Object.entries(bySuite).sort((a, b) => a[0].localeCompare(b[0]));
for (const [name, s] of sortedSuites) {
  const dur = (s.duration / 1000).toFixed(1);
  const failCol = s.failed > 0 ? `**${s.failed}**` : '0';
  lines.push(`| ${name} | ${s.passed} | ${failCol} | ${s.flaky} | ${s.skipped} | ${dur}s |`);
}
lines.push('');

// Failed tests detail
const failedTests = allResults.filter(r => r.status === 'unexpected' || r.status === 'failed');
if (failedTests.length > 0) {
  lines.push(`## Failed Tests`);
  lines.push('');
  for (const t of failedTests) {
    lines.push(`### ${t.title}`);
    lines.push(`- **Suite**: \`${path.basename(t.suite)}\``);
    if (t.error) lines.push(`- **Error**: ${t.error.split('\n')[0]}`);
    lines.push('');
  }
}

// Flaky tests detail
const flakyTests = allResults.filter(r => r.status === 'flaky');
if (flakyTests.length > 0) {
  lines.push(`## Flaky Tests`);
  lines.push('');
  for (const t of flakyTests) {
    lines.push(`- **${t.title}** (\`${path.basename(t.suite)}\`) — ${t.retry} retries`);
  }
  lines.push('');
}

lines.push('---');
lines.push(`*Generated by KTS E2E Framework — scripts/summary.mjs*`);

const md = lines.join('\n');

// --- Write outputs ---
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, md, 'utf-8');

// --- Stdout summary ---
console.log('');
console.log('========================================');
console.log(`  KTS E2E Regression Summary`);
console.log('========================================');
console.log(`  Status:    ${status === 'PASS' ? 'PASS' : 'FAIL'}`);
console.log(`  Total:     ${total} tests`);
console.log(`  Passed:    ${passed}`);
console.log(`  Failed:    ${failed}`);
console.log(`  Flaky:     ${flaky}`);
console.log(`  Skipped:   ${skipped}`);
console.log(`  Duration:  ${durationMin}m`);
console.log('----------------------------------------');

for (const [name, s] of sortedSuites) {
  const icon = s.failed > 0 ? 'FAIL' : s.flaky > 0 ? 'FLAKY' : 'PASS';
  console.log(`  [${icon}] ${name}: ${s.passed}/${s.total} passed`);
}

console.log('========================================');
console.log(`  Report: ${outPath}`);
console.log('');

// Exit code
process.exit(failed > 0 ? 1 : 0);
