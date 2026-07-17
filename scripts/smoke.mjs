import { spawnSync } from 'node:child_process';

function runCli(args, expectedStatus) {
  const result = spawnSync(process.execPath, ['dist/cli.js', ...args], {
    encoding: 'utf8',
  });

  if (result.error) throw result.error;
  if (result.status !== expectedStatus) {
    throw new Error(
      `Expected ActionFence to exit ${expectedStatus}, received ${String(result.status)}.\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`,
    );
  }

  return result;
}

console.log('Running CLI smoke checks...');

const secureText = runCli(['examples/secure-workflow.yml'], 0);
if (
  !secureText.stdout.includes('Passing checks') &&
  !secureText.stdout.includes('No workflow security issues found')
) {
  throw new Error('Expected secure-workflow.yml text run to pass.');
}

const secureJson = runCli(['examples/secure-workflow.yml', '--format', 'json'], 0);
const secureObj = JSON.parse(secureJson.stdout);
if (secureObj.success !== true) {
  throw new Error('Expected secure-workflow.yml json run to report success: true.');
}

const insecureText = runCli(['examples/insecure-workflow.yml'], 1);
if (!insecureText.stdout.includes('Found 5 issue(s)')) {
  throw new Error('Expected insecure-workflow.yml text run to report 5 issues.');
}

const insecureJson = runCli(['examples/insecure-workflow.yml', '--format', 'json'], 1);
const insecureObj = JSON.parse(insecureJson.stdout);
if (insecureObj.success !== false) {
  throw new Error('Expected insecure-workflow.yml json run to report success: false.');
}
if (insecureObj.summary.errors !== 4) {
  throw new Error(`Expected 4 errors in insecure-workflow.yml, got ${insecureObj.summary.errors}`);
}
if (insecureObj.summary.warnings !== 1) {
  throw new Error(
    `Expected 1 warning in insecure-workflow.yml, got ${insecureObj.summary.warnings}`,
  );
}

const filterJson = runCli(
  ['examples/insecure-workflow.yml', '--rules', 'pin-actions', '--format', 'json'],
  1,
);
const filterObj = JSON.parse(filterJson.stdout);
if (filterObj.issues.length !== 1 || filterObj.issues[0].ruleId !== 'pin-actions') {
  throw new Error('Expected rule filtering to limit output to pin-actions.');
}

runCli(['non_existent.yml'], 3);

runCli(['--invalid-flag'], 2);

console.log('CLI smoke checks passed successfully.');
