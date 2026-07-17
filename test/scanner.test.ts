import { describe, it, expect } from 'vitest';
import { Scanner } from '../src/scanner.js';

describe('Scanner integration tests', () => {
  it('should scan valid yaml content with no issues', () => {
    const yamlContent = `
name: CI
on: [push]
permissions:
  contents: read
jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@b4ffde55f3e902f1ec10476a2186e4099512b520
        with:
          fetch-depth: 0
`;
    const scanner = new Scanner();
    const issues = scanner.scanContent(yamlContent, 'ci.yml');
    expect(issues).toHaveLength(0);
  });

  it('should report yaml syntax errors', () => {
    const malformedYaml = `
name: CI
on: [push
permissions: contents: read
`;
    const scanner = new Scanner();
    const issues = scanner.scanContent(malformedYaml, 'ci.yml');
    expect(issues).toHaveLength(1);
    expect(issues[0]?.ruleId).toBe('yaml-parse');
    expect(issues[0]?.message).toContain('Failed to parse YAML');
  });

  it('should report rules issues for complex workflows', () => {
    const badYaml = `
name: Release
on:
  issues:
    types: [opened]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Bad Injection
        run: |
          echo "Title: \${{ github.event.issue.title }}"
          echo "Body: \${{ github.event.issue.body }}"
`;
    const scanner = new Scanner();
    const issues = scanner.scanContent(badYaml, 'release.yml');

    expect(issues.length).toBe(5);

    const ruleIds = issues.map((i) => i.ruleId);
    expect(ruleIds).toContain('pin-actions');
    expect(ruleIds).toContain('workflow-permissions');
    expect(ruleIds).toContain('command-injection');
    expect(ruleIds).toContain('timeout-minutes');
  });
});
