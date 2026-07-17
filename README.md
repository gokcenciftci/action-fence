# ActionFence

[![CI](https://github.com/gokcenciftci/action-fence/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/gokcenciftci/action-fence/actions/workflows/ci.yml)
[![CodeQL](https://github.com/gokcenciftci/action-fence/actions/workflows/codeql.yml/badge.svg?branch=master)](https://github.com/gokcenciftci/action-fence/actions/workflows/codeql.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

ActionFence scans your local GitHub Actions workflow files and exits non-zero if security or compliance rules are violated. It is a deterministic, local-first CI gate: it does not fetch remote actions, call external APIs, or send your workflow configurations anywhere.

> Part of the **Fence Security & Quality Suite** (`SchemaFence`, `ActionFence`, `EnvFence`, `AuditFence`).

> v0.1 is intentionally focused. It prioritizes catching critical supply chain, permissions, and command execution vulnerabilities with predictable, offline behavior.

## Why ActionFence?

GitHub Actions run with access to your repository, credentials, and secrets, making them high-value targets. Standard text diffs and general linters cannot easily catch:

- **Third-party actions using mutable tags** (like `@v4` or `@main`) that can be hijacked or updated to point to malicious code.
- **Over-privileged workflow tokens** that are left with default read/write permissions instead of being scoped down.
- **Untrusted inputs interpolated directly into scripts**, exposing the workflow to Remote Code Execution (RCE) via command injection.
- **Runaway workflows** lacking explicit timeouts that drain action minutes and incur unexpected costs.

ActionFence runs locally in milliseconds and enforces secure baselines.

## Quick start

ActionFence is run from a clone or locally built bundle:

```bash
git clone https://github.com/gokcenciftci/action-fence.git
cd action-fence
npm ci
npm run build

# Run against default .github/workflows directory
node dist/cli.js
```

Example output:

```text
examples/insecure-workflow.yml
  ERROR [pin-actions]:12 - Step "Checkout Code" in job "build" uses action "actions/checkout@v4" which is not pinned to a 40-character SHA commit hash. Pinned tags (like @v4) can be mutable.
  ERROR [workflow-permissions]:8 - Job "build" is missing a permissions block and no top-level workflow permissions are defined.
  ERROR [command-injection]:15 - Step "Print PR Title" in job "build" interpolates untrusted context "${{ github.event.pull_request.title }}" directly inside run script. Use an environment variable to pass this value safely.
  ERROR [command-injection]:19 - Step "Print head ref" in job "build" interpolates untrusted context "${{ github.head_ref }}" directly inside run script. Use an environment variable to pass this value safely.
  WARNING [timeout-minutes]:8 - Job "build" is missing a "timeout-minutes" property. Specifying a timeout limits runaway resource usage in CI.

✖ Found 5 issue(s) (4 error(s), 1 warning(s)).
```

For CI-friendly output, add `--format json`.

## CI contract

```bash
node dist/cli.js \
  .github/workflows/ \
  --format json
```

| Exit code | Meaning                                                  |
| --------- | -------------------------------------------------------- |
| `0`       | Scan completed; no errors found (warnings are bypassed). |
| `1`       | Scan completed; one or more security rule errors found.  |
| `2`       | The command arguments or rule filter is invalid.         |
| `3`       | An input read, syntax, or YAML parsing error occurred.   |
| `70`      | An unexpected internal tool error occurred.              |

JSON output is written to standard output; error logs are written to standard error. JSON outputs use relative paths with forward slashes for cross-platform consistency.

## Rules implemented in v0.1

ActionFence enforces a secure-by-default posture. Finding codes can be either errors (non-zero exits) or warnings (does not block CI).

| Rule ID                | Severity            | Checks                                                                  |
| :--------------------- | :------------------ | :---------------------------------------------------------------------- |
| `pin-actions`          | `error`             | Enforces 40-character commit SHAs for third-party actions.              |
| `workflow-permissions` | `error` / `warning` | Verifies presence of a permissions block; warns on `write-all`.         |
| `command-injection`    | `error`             | Catches direct interpolation of untrusted contexts and secrets in runs. |
| `timeout-minutes`      | `warning`           | Warns if a job fails to declare a `timeout-minutes` limit.              |

Detailed specifications and compliant examples are in [the security rules](docs/security-rules.md).

## Supported inputs and deliberate limits

- Reads local YAML files (`.yml` or `.yaml`).
- Discovers workflows under `.github/workflows` by default.
- Performs offline token and pattern scanning; does not connect to the network.
- Handles missing or malformed inputs gracefully by issuing file error findings (Exit `3`).

## Privacy and input safety

ActionFence processes files fully offline. It never pulls remote configurations or makes network requests. Scan results contain relative paths and rule messages. Ensure reports containing finding summaries are treated as workflow configuration metadata.

## Architecture

```text
CLI arguments
  -> local scanner
  -> safe YAML parser
  -> pure rules execution
  -> text / JSON reporter
  -> explicit exit code
```

See [architecture notes](docs/architecture.md) for structural boundaries, pipeline designs, and exit codes.

## Development

Requires Node.js 20 or newer.

```bash
npm ci
npm run validate
```

`validate` enforces linting rules, Prettier formatting, TypeScript typecheck, Vitest unit test coverage, production bundle building, and CLI integration smoke tests. See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and [the Code of Conduct](CODE_OF_CONDUCT.md) for guidelines.

## License

[MIT](LICENSE) © 2026 Gökçen Çiftci
