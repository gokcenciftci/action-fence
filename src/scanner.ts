import * as fs from 'fs';
import * as path from 'path';
import yaml from 'yaml';
import { rules } from './rules/index.js';
import type { Issue, ScannerOptions, Workflow } from './types.js';

export class Scanner {
  private options: ScannerOptions;

  constructor(options: ScannerOptions = {}) {
    this.options = options;
  }

  scanContent(rawContent: string, filePath: string): Issue[] {
    const issues: Issue[] = [];

    let workflow: Workflow;
    try {
      workflow = yaml.parse(rawContent) as Workflow;
    } catch (err) {
      const error = err as Error & { line?: number };
      issues.push({
        ruleId: 'yaml-parse',
        message: `Failed to parse YAML workflow file: ${error.message ?? 'Unknown error'}`,
        file: filePath,
        line: error.line ?? 1,
        severity: 'error',
      });
      return issues;
    }

    if (!workflow || typeof workflow !== 'object') {
      issues.push({
        ruleId: 'yaml-parse',
        message: 'Workflow file is empty or invalid structure.',
        file: filePath,
        severity: 'error',
      });
      return issues;
    }

    const activeRules = this.options.rules
      ? rules.filter((rule) => this.options.rules?.includes(rule.id))
      : rules;

    for (const rule of activeRules) {
      try {
        const ruleIssues = rule.run(workflow, filePath, rawContent);
        issues.push(...ruleIssues);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        issues.push({
          ruleId: rule.id,
          message: `Internal error running rule: ${error.message}`,
          file: filePath,
          severity: 'warning',
        });
      }
    }

    return issues;
  }

  scanFile(filePath: string): Issue[] {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return this.scanContent(content, filePath);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return [
        {
          ruleId: 'file-read',
          message: `Failed to read workflow file: ${errorMessage}`,
          file: filePath,
          severity: 'error',
        },
      ];
    }
  }

  scan(): Issue[] {
    const targetPaths: string[] = [];
    const allIssues: Issue[] = [];

    if (this.options.paths && this.options.paths.length > 0) {
      for (const p of this.options.paths) {
        if (fs.existsSync(p)) {
          const stat = fs.statSync(p);
          if (stat.isDirectory()) {
            targetPaths.push(...this.findWorkflowsInDir(p));
          } else {
            targetPaths.push(p);
          }
        } else {
          allIssues.push({
            ruleId: 'file-read',
            message: `Failed to read workflow file: File or directory does not exist: ${p}`,
            file: p,
            severity: 'error',
          });
        }
      }
    } else {
      const defaultDir = path.join(process.cwd(), '.github', 'workflows');
      if (fs.existsSync(defaultDir)) {
        targetPaths.push(...this.findWorkflowsInDir(defaultDir));
      }
    }

    for (const file of targetPaths) {
      allIssues.push(...this.scanFile(file));
    }

    return allIssues;
  }

  private findWorkflowsInDir(dirPath: string): string[] {
    const files: string[] = [];
    try {
      const items = fs.readdirSync(dirPath);
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);
        if (stat.isFile() && (item.endsWith('.yml') || item.endsWith('.yaml'))) {
          files.push(fullPath);
        }
      }
    } catch (_err) {}
    return files;
  }
}
