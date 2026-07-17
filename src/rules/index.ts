import { pinActionsRule } from './pin-actions.js';
import { workflowPermissionsRule } from './workflow-permissions.js';
import { commandInjectionRule } from './command-injection.js';
import { timeoutMinutesRule } from './timeout-minutes.js';
import type { Rule } from '../types.js';

export const rules: Rule[] = [
  pinActionsRule,
  workflowPermissionsRule,
  commandInjectionRule,
  timeoutMinutesRule,
];

export { pinActionsRule, workflowPermissionsRule, commandInjectionRule, timeoutMinutesRule };
