import type { Rule, Issue } from '../types.js';

export const workflowPermissionsRule: Rule = {
  id: 'workflow-permissions',
  description:
    'Enforce that workflows restrict default token permissions by specifying a permissions block.',
  run(workflow, filePath, rawContent) {
    const issues: Issue[] = [];

    const hasWorkflowPermissions = workflow.permissions !== undefined;

    if (!hasWorkflowPermissions) {
      if (workflow.jobs) {
        for (const [jobId, job] of Object.entries(workflow.jobs)) {
          if (job.permissions === undefined) {
            issues.push({
              ruleId: this.id,
              message: `Job "${jobId}" is missing a permissions block and no top-level workflow permissions are defined.`,
              file: filePath,
              severity: 'error',
            });
          }
        }
      } else {
        issues.push({
          ruleId: this.id,
          message: 'Workflow does not define a top-level permissions block and contains no jobs.',
          file: filePath,
          severity: 'warning',
        });
      }
    }

    if (workflow.permissions === 'write-all') {
      issues.push({
        ruleId: this.id,
        message:
          'Top-level permissions block uses insecure "write-all". Pin permissions explicitly.',
        file: filePath,
        severity: 'warning',
      });
    }

    if (workflow.jobs) {
      for (const [jobId, job] of Object.entries(workflow.jobs)) {
        if (job.permissions === 'write-all') {
          issues.push({
            ruleId: this.id,
            message: `Job "${jobId}" permissions block uses insecure "write-all". Pin permissions explicitly.`,
            file: filePath,
            severity: 'warning',
          });
        }
      }
    }

    issues.forEach((issue) => {
      const lines = rawContent.split(/\r?\n/);
      if (issue.message.includes('Top-level permissions')) {
        const lineIdx = lines.findIndex((l) => l.trim().startsWith('permissions:'));
        if (lineIdx !== -1) issue.line = lineIdx + 1;
      } else if (issue.message.includes('Job "')) {
        const jobIdMatch = issue.message.match(/Job "([^"]+)"/);
        if (jobIdMatch?.[1]) {
          const jobId = jobIdMatch[1];
          const jobLineIdx = lines.findIndex((l) => l.trim().startsWith(`${jobId}:`));
          if (jobLineIdx !== -1) {
            issue.line = jobLineIdx + 1;
          }
        }
      }
    });

    return issues;
  },
};
