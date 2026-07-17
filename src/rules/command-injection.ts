import type { Rule, Issue } from '../types.js';

export const commandInjectionRule: Rule = {
  id: 'command-injection',
  description:
    'Detect command injection risks where untrusted GitHub context parameters are interpolated directly in run scripts.',
  run(workflow, filePath, rawContent) {
    const issues: Issue[] = [];
    if (!workflow.jobs) return issues;

    const untrustedPatterns = [
      /\bgithub\.event\b/,
      /\bgithub\.head_ref\b/,
      /\bgithub\.base_ref\b/,
      /\bgithub\.event_path\b/,
      /\bgithub\.event\.client_payload\b/,
      /\bgithub\.event\.inputs\b/,
      /\binputs\.\w+/,
    ];

    const sensitivePatterns = [/\bsecrets\.\w+/, /\bgithub\.token\b/];

    for (const [jobId, job] of Object.entries(workflow.jobs)) {
      if (!job.steps || !Array.isArray(job.steps)) continue;

      job.steps.forEach((step, index) => {
        if (!step.run) return;

        const runCmd = step.run;
        const interpolationRegex = /\$\{\{\s*([\s\S]+?)\s*\}\}/g;
        let match;

        while ((match = interpolationRegex.exec(runCmd)) !== null) {
          const expression = match[1];
          if (!expression) continue;

          const isUntrusted = untrustedPatterns.some((pattern) => pattern.test(expression));
          const isSensitive = sensitivePatterns.some((pattern) => pattern.test(expression));

          if (isUntrusted) {
            issues.push({
              ruleId: this.id,
              message: `Step "${step.name ?? `index ${index}`}" in job "${jobId}" interpolates untrusted context "${match[0]}" directly inside run script. Use an environment variable to pass this value safely.`,
              file: filePath,
              severity: 'error',
            });
          } else if (isSensitive) {
            issues.push({
              ruleId: this.id,
              message: `Step "${step.name ?? `index ${index}`}" in job "${jobId}" interpolates sensitive secret/token "${match[0]}" directly inside run script. Use an environment variable to pass this value safely.`,
              file: filePath,
              severity: 'error',
            });
          }
        }
      });
    }

    issues.forEach((issue) => {
      const lines = rawContent.split(/\r?\n/);
      const stepNameMatch = issue.message.match(/Step "([^"]+)"/);
      if (stepNameMatch?.[1]) {
        const stepName = stepNameMatch[1];
        let lineIdx = -1;
        if (stepName.startsWith('index ')) {
          lineIdx = lines.findIndex((l) => l.trim().startsWith('run:'));
        } else {
          const nameIdx = lines.findIndex(
            (l) => l.includes(`name: ${stepName}`) || l.includes(`name: "${stepName}"`),
          );
          if (nameIdx !== -1) {
            const runIdx = lines.slice(nameIdx).findIndex((l) => l.trim().startsWith('run:'));
            if (runIdx !== -1) {
              lineIdx = nameIdx + runIdx;
            } else {
              lineIdx = nameIdx;
            }
          }
        }
        if (lineIdx !== -1) {
          issue.line = lineIdx + 1;
        }
      }
    });

    return issues;
  },
};
