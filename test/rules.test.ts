import { describe, it, expect } from 'vitest';
import { pinActionsRule } from '../src/rules/pin-actions.js';
import { workflowPermissionsRule } from '../src/rules/workflow-permissions.js';
import { commandInjectionRule } from '../src/rules/command-injection.js';
import { timeoutMinutesRule } from '../src/rules/timeout-minutes.js';
import type { Workflow } from '../src/types.js';

describe('pin-actions rule', () => {
  it('should pass for SHA pinned actions', () => {
    const wf: Workflow = {
      jobs: {
        build: {
          steps: [
            { uses: 'actions/checkout@b4ffde55f3e902f1ec10476a2186e4099512b520' },
            { uses: './.github/actions/local-action' },
            { uses: 'docker://alpine:3.14' },
          ],
        },
      },
    };
    const issues = pinActionsRule.run(wf, 'workflow.yml', '');
    expect(issues).toHaveLength(0);
  });

  it('should fail for tagged actions', () => {
    const wf: Workflow = {
      jobs: {
        build: {
          steps: [
            { name: 'Checkout', uses: 'actions/checkout@v4' },
            { name: 'Setup Node', uses: 'actions/setup-node@main' },
          ],
        },
      },
    };
    const issues = pinActionsRule.run(wf, 'workflow.yml', '');
    expect(issues).toHaveLength(2);
    expect(issues[0]?.severity).toBe('error');
    expect(issues[0]?.message).toContain('not pinned to a 40-character SHA');
  });

  it('should fail for actions without version specifier', () => {
    const wf: Workflow = {
      jobs: {
        build: {
          steps: [{ uses: 'actions/checkout' }],
        },
      },
    };
    const issues = pinActionsRule.run(wf, 'workflow.yml', '');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.message).toContain('does not specify a pinned action version');
  });
});

describe('workflow-permissions rule', () => {
  it('should pass when workflow permissions block is defined', () => {
    const wf: Workflow = {
      permissions: {
        contents: 'read',
      },
      jobs: {
        build: {
          steps: [{ run: 'echo test' }],
        },
      },
    };
    const issues = workflowPermissionsRule.run(wf, 'workflow.yml', '');
    expect(issues).toHaveLength(0);
  });

  it('should pass when workflow level is missing but all jobs define permissions', () => {
    const wf: Workflow = {
      jobs: {
        build: {
          permissions: {
            contents: 'read',
          },
          steps: [{ run: 'echo test' }],
        },
      },
    };
    const issues = workflowPermissionsRule.run(wf, 'workflow.yml', '');
    expect(issues).toHaveLength(0);
  });

  it('should fail when both workflow and job permissions are missing', () => {
    const wf: Workflow = {
      jobs: {
        build: {
          steps: [{ run: 'echo test' }],
        },
      },
    };
    const issues = workflowPermissionsRule.run(wf, 'workflow.yml', '');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.severity).toBe('error');
    expect(issues[0]?.message).toContain('missing a permissions block');
  });

  it('should warn when permissions block uses write-all', () => {
    const wf: Workflow = {
      permissions: 'write-all',
      jobs: {
        build: {
          steps: [{ run: 'echo test' }],
        },
      },
    };
    const issues = workflowPermissionsRule.run(wf, 'workflow.yml', '');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.severity).toBe('warning');
    expect(issues[0]?.message).toContain('uses insecure "write-all"');
  });
});

describe('command-injection rule', () => {
  it('should pass for safe command usage', () => {
    const wf: Workflow = {
      jobs: {
        build: {
          steps: [
            { run: 'echo "Hello World"' },
            {
              run: 'echo "$TITLE"',
              env: { TITLE: '${{ github.event.issue.title }}' },
            },
          ],
        },
      },
    };
    const issues = commandInjectionRule.run(wf, 'workflow.yml', '');
    expect(issues).toHaveLength(0);
  });

  it('should fail for direct interpolation of github event properties', () => {
    const wf: Workflow = {
      jobs: {
        build: {
          steps: [
            { run: 'echo "Issue title is: ${{ github.event.issue.title }}"' },
            { run: 'echo "Branch is: ${{ github.head_ref }}"' },
          ],
        },
      },
    };
    const issues = commandInjectionRule.run(wf, 'workflow.yml', '');
    expect(issues).toHaveLength(2);
    expect(issues[0]?.severity).toBe('error');
    expect(issues[0]?.message).toContain('interpolates untrusted context');
  });

  it('should fail for direct interpolation of inputs and secrets', () => {
    const wf: Workflow = {
      jobs: {
        build: {
          steps: [
            { run: 'echo "${{ inputs.username }}"' },
            { run: 'echo "${{ secrets.SUPER_SECRET }}"' },
            { run: 'echo "${{ github.token }}"' },
            { run: 'echo "${{ github.event.client_payload.foo }}"' },
          ],
        },
      },
    };
    const issues = commandInjectionRule.run(wf, 'workflow.yml', '');
    expect(issues).toHaveLength(4);
    expect(issues[0]?.message).toContain('interpolates untrusted context');
    expect(issues[1]?.message).toContain('interpolates sensitive secret/token');
    expect(issues[2]?.message).toContain('interpolates sensitive secret/token');
    expect(issues[3]?.message).toContain('interpolates untrusted context');
  });
});

describe('timeout-minutes rule', () => {
  it('should pass if all jobs specify timeout-minutes', () => {
    const wf: Workflow = {
      jobs: {
        build: {
          'timeout-minutes': 15,
          steps: [{ run: 'echo test' }],
        },
      },
    };
    const issues = timeoutMinutesRule.run(wf, 'workflow.yml', '');
    expect(issues).toHaveLength(0);
  });

  it('should warn if a job is missing timeout-minutes', () => {
    const wf: Workflow = {
      jobs: {
        build: {
          steps: [{ run: 'echo test' }],
        },
        deploy: {
          'timeout-minutes': 30,
          steps: [{ run: 'echo deploy' }],
        },
      },
    };
    const issues = timeoutMinutesRule.run(wf, 'workflow.yml', '');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.severity).toBe('warning');
    expect(issues[0]?.message).toContain('missing a "timeout-minutes" property');
  });
});
