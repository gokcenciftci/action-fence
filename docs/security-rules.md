# Security Rules

ActionFence evaluates GitHub Actions workflow files against four core rules. Finding classifications are split into `error` (blocks CI) and `warning` (notifies but permits passing).

| Rule ID                | Severity       | Trigger                                                                                       | Rationale                                                                                                                |
| ---------------------- | -------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `pin-actions`          | `error`        | An action reference uses a mutable tag (e.g. `@v4`, `@main`) or has no version tag.           | Tag names are mutable and can be hijacked to execute arbitrary code (supply chain attack). Use a 40-char SHA instead.    |
| `workflow-permissions` | `error`/`warn` | Missing a permissions block (`error`) or setting `permissions: write-all` (`warning`).        | Default repository tokens are overly permissive. Setting explicit, narrow permissions follows least-privilege.           |
| `command-injection`    | `error`        | Interpolating untrusted contexts (`github.event.*`, `inputs.*`) or secrets directly in `run`. | Direct shell interpolation allows arbitrary shell command execution (RCE) or secret credential leaks via logs/traces.    |
| `timeout-minutes`      | `warning`      | A job definition is missing the `timeout-minutes` property.                                   | Default timeout is 6 hours on GitHub. A hung run can exhaust billing minutes. Setting a timeout controls resource usage. |

---

## Rule Details

### pin-actions

Every third-party GitHub Action should be pinned to a cryptographically secure 40-character SHA-1 commit hash.

- **Non-compliant**:
  ```yaml
  uses: actions/checkout@v4
  ```
- **Compliant**:
  ```yaml
  uses: actions/checkout@b4ffde55f3e902f1ec10476a2186e4099512b520
  ```

_Note: Local actions (e.g., `./.github/actions/local`) and Docker actions (e.g., `docker://alpine`) are bypassed by this rule._

### workflow-permissions

Token permissions (`GITHUB_TOKEN`) must be constrained using the `permissions` block at the workflow or job level.

- **Non-compliant** (Missing block):
  Default GITHUB_TOKEN has broad write/read capabilities.
- **Insecure** (Warning):
  ```yaml
  permissions: write-all
  ```
- **Compliant**:
  ```yaml
  permissions:
    contents: read
  ```

### command-injection

Directly interpolating user-controlled contexts or credentials inside shell steps allows remote attackers to run commands on your runners or steal secrets.

- **Non-compliant**:
  ```yaml
  run: echo "PR Title is: ${{ github.event.pull_request.title }}"
  run: curl -H "Authorization: Bearer ${{ secrets.GITHUB_TOKEN }}"
  ```
- **Compliant**:
  ```yaml
  run: echo "PR Title is: $PR_TITLE"
  env:
    PR_TITLE: ${{ github.event.pull_request.title }}
  ```

### timeout-minutes

Runaway processes can hang indefinitely, costing time and billing minutes. Jobs must define an explicit timeout.

- **Non-compliant**:
  Missing `timeout-minutes`.
- **Compliant**:
  ```yaml
  jobs:
    build:
      runs-on: ubuntu-latest
      timeout-minutes: 15
  ```
