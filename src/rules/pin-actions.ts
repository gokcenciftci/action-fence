import type { Rule, Issue } from '../types.js';

export const pinActionsRule: Rule = {
  id: 'pin-actions',
  description: 'Enforce that third-party actions are pinned to a 40-character SHA commit hash.',
  run(workflow, filePath, rawContent) {
    const issues: Issue[] = [];
    if (!workflow.jobs) return issues;

    for (const [jobId, job] of Object.entries(workflow.jobs)) {
      if (!job.steps || !Array.isArray(job.steps)) continue;

      job.steps.forEach((step, index) => {
        if (!step.uses) return;

        const uses = step.uses.trim();

        if (uses.startsWith('./') || uses.startsWith('docker://')) {
          return;
        }

        const parts = uses.split('@');
        if (parts.length < 2) {
          issues.push({
            ruleId: this.id,
            message: `Step "${step.name ?? `index ${index}`}" in job "${jobId}" does not specify a pinned action version tag or hash.`,
            file: filePath,
            severity: 'error',
          });
          return;
        }

        const ref = parts[1];
        if (!ref) {
          issues.push({
            ruleId: this.id,
            message: `Step "${step.name ?? `index ${index}`}" in job "${jobId}" has an empty action reference after '@'.`,
            file: filePath,
            severity: 'error',
          });
          return;
        }

        const shaRegex = /^[a-fA-F0-9]{40}$/;
        if (!shaRegex.test(ref)) {
          issues.push({
            ruleId: this.id,
            message: `Step "${step.name ?? `index ${index}`}" in job "${jobId}" uses action "${uses}" which is not pinned to a 40-character SHA commit hash. Pinned tags (like @v4) can be mutable.`,
            file: filePath,
            severity: 'error',
          });
        }
      });
    }

    issues.forEach((issue) => {
      const match = issue.message.match(/uses action "([^"]+)"/);
      if (match?.[1]) {
        const actionStr = match[1];
        const lines = rawContent.split(/\r?\n/);
        const lineIdx = lines.findIndex((l) => l.includes(actionStr));
        if (lineIdx !== -1) {
          issue.line = lineIdx + 1;
        }
      }
    });

    return issues;
  },
};
