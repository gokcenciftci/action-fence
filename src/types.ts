export interface Step {
  id?: string;
  name?: string;
  uses?: string;
  run?: string;
  with?: Record<string, unknown>;
  env?: Record<string, string>;
}

export interface Job {
  name?: string;
  'runs-on'?: string;
  permissions?: Record<string, string> | string;
  steps?: Step[];
  env?: Record<string, string>;
  'timeout-minutes'?: number;
}

export interface Workflow {
  name?: string;
  on?: unknown;
  permissions?: Record<string, string> | string;
  env?: Record<string, string>;
  jobs?: Record<string, Job>;
}

export type IssueSeverity = 'error' | 'warning';

export interface Issue {
  ruleId: string;
  message: string;
  file: string;
  line?: number;
  column?: number;
  severity: IssueSeverity;
}

export interface Rule {
  id: string;
  description: string;
  run(workflow: Workflow, filePath: string, rawContent: string): Issue[];
}

export interface ScannerOptions {
  paths?: string[];
  rules?: string[];
}
