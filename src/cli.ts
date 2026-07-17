#!/usr/bin/env node
import * as path from 'path';
import { Scanner } from './scanner.js';
import type { Issue, ScannerOptions } from './types.js';

const pkgVersion = '0.1.0';

function printHelp() {
  console.log(`
action-fence v${pkgVersion}
A deterministic, local-first GitHub Actions workflow security and compliance gate for CI.

Usage:
  action-fence [paths...] [options]

Options:
  --rules <rule1,rule2>   Specify which rules to run (comma separated)
  --format <json|text>    Specify output format (json or text, default: text)
  --help, -h              Show this help message
  --version, -v           Show version information

Rules:
  pin-actions            Enforces third-party actions to be pinned to a 40-character SHA hash.
  workflow-permissions   Enforces least-privilege permissions block.
  command-injection      Detects shell script interpolation command injection risks.
  timeout-minutes        Enforces job timeout-minutes.
`);
}

function run() {
  const paths: string[] = [];
  let rulesFilter: string[] | undefined;
  let format: 'text' | 'json' = 'text';

  if (process.env.INPUT_PATHS || process.env.INPUT_RULES || process.env.INPUT_FORMAT) {
    if (process.env.INPUT_PATHS) {
      paths.push(
        ...process.env.INPUT_PATHS.split(/\s+/)
          .map((p) => p.trim())
          .filter(Boolean),
      );
    }
    if (process.env.INPUT_RULES) {
      rulesFilter = process.env.INPUT_RULES.split(',')
        .map((r) => r.trim())
        .filter(Boolean);
    }
    if (process.env.INPUT_FORMAT === 'json' || process.env.INPUT_FORMAT === 'text') {
      format = process.env.INPUT_FORMAT as 'json' | 'text';
    }
  } else {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
      printHelp();
      process.exit(0);
    }

    if (args.includes('--version') || args.includes('-v')) {
      console.log(`action-fence v${pkgVersion}`);
      process.exit(0);
    }

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === undefined) continue;

      if (arg === '--rules') {
        const nextArg = args[i + 1];
        if (nextArg && !nextArg.startsWith('-')) {
          rulesFilter = nextArg.split(',').map((r) => r.trim());
          i++;
        } else {
          console.error('Error: --rules option requires a comma-separated list of rule IDs.');
          process.exit(2);
        }
      } else if (arg === '--format') {
        const nextArg = args[i + 1];
        if (nextArg === 'json' || nextArg === 'text') {
          format = nextArg as 'json' | 'text';
          i++;
        } else {
          console.error('Error: --format option requires "json" or "text".');
          process.exit(2);
        }
      } else if (arg.startsWith('-')) {
        console.error(`Error: Unknown option "${arg}". Run with --help for usage.`);
        process.exit(2);
      } else {
        paths.push(arg);
      }
    }
  }

  const validRuleIds = [
    'pin-actions',
    'workflow-permissions',
    'command-injection',
    'timeout-minutes',
  ];
  if (rulesFilter) {
    const invalidRules = rulesFilter.filter((r) => !validRuleIds.includes(r));
    if (invalidRules.length > 0) {
      console.error(`Error: Invalid rule(s): ${invalidRules.join(', ')}.`);
      console.error(`Available rules: ${validRuleIds.join(', ')}`);
      process.exit(2);
    }
  }

  const options: ScannerOptions = {};
  if (paths.length > 0) {
    options.paths = paths;
  }
  if (rulesFilter !== undefined) {
    options.rules = rulesFilter;
  }

  const scanner = new Scanner(options);

  let issues: Issue[];
  try {
    issues = scanner.scan();
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error(`Error: Unexpected failure during scan: ${error}`);
    process.exit(70);
  }

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  const hasYamlOrFileError = issues.some(
    (i) => i.ruleId === 'yaml-parse' || i.ruleId === 'file-read',
  );

  if (format === 'json') {
    const resultObj = {
      success: errorCount === 0 && !hasYamlOrFileError,
      issues: issues.map((issue) => ({
        ruleId: issue.ruleId,
        message: issue.message,
        file: path.relative(process.cwd(), issue.file).replace(/\\/g, '/'),
        line: issue.line,
        severity: issue.severity,
      })),
      summary: {
        total: issues.length,
        errors: errorCount,
        warnings: warningCount,
      },
    };
    console.log(JSON.stringify(resultObj, null, 2));

    if (hasYamlOrFileError) {
      process.exit(3);
    } else if (errorCount > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  }

  if (issues.length === 0) {
    console.log('\x1b[32m✔ No workflow security issues found.\x1b[0m');
    process.exit(0);
  }

  const groupedIssues: Record<string, Issue[]> = {};
  for (const issue of issues) {
    const relativeFile = path.relative(process.cwd(), issue.file);
    if (!groupedIssues[relativeFile]) {
      groupedIssues[relativeFile] = [];
    }
    groupedIssues[relativeFile].push(issue);
  }

  for (const [file, fileIssues] of Object.entries(groupedIssues)) {
    console.log(`\n\x1b[4m${file}\x1b[0m`);
    for (const issue of fileIssues) {
      const lineStr = issue.line ? `:${issue.line}` : '';
      const severityColor = issue.severity === 'error' ? '\x1b[31m' : '\x1b[33m';
      const severityLabel = issue.severity.toUpperCase();

      console.log(
        `  ${severityColor}${severityLabel}\x1b[0m [${issue.ruleId}]${lineStr} - ${issue.message}`,
      );
    }
  }

  if (hasYamlOrFileError) {
    console.log(`\n\x1b[31m✖ Failed due to input safety/structural error.\x1b[0m`);
    process.exit(3);
  } else if (errorCount > 0) {
    console.log(
      `\n\x1b[31m✖ Found ${issues.length} issue(s) (${errorCount} error(s), ${warningCount} warning(s)).\x1b[0m`,
    );
    process.exit(1);
  } else {
    console.log(
      `\n\x1b[33m⚠ Found ${issues.length} warning(s) (errors: 0). Passing checks.\x1b[0m`,
    );
    process.exit(0);
  }
}

run();
