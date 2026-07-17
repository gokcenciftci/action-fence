import type { Rule, Issue } from '../types.js';

export const timeoutMinutesRule: Rule = {
  id: 'timeout-minutes',
  description:
    'Enforce that jobs specify a timeout-minutes property to limit resource consumption.',
  run(workflow, filePath, rawContent) {
    const issues: Issue[] = [];
    if (!workflow.jobs) return issues;

    for (const [jobId, job] of Object.entries(workflow.jobs)) {
      if (job['timeout-minutes'] === undefined) {
        issues.push({
          ruleId: this.id,
          message: `Job "${jobId}" is missing a "timeout-minutes" property. Specifying a timeout limits runaway resource usage in CI.`,
          file: filePath,
          severity: 'warning',
        });
      }
    }

    issues.forEach((issue) => {
      const lines = rawContent.split(/\r?\n/);
      const jobIdMatch = issue.message.match(/Job "([^"]+)"/);
      if (jobIdMatch?.[1]) {
        const jobId = jobIdMatch[1];
        const jobLineIdx = lines.findIndex((l) => l.trim().startsWith(`${jobId}:`));
        if (jobLineIdx !== -1) {
          issue.line = jobLineIdx + 1;
        }
      }
    });

    return issues;
  },
};
