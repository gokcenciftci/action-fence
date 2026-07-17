# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-07-17

### Added

- Initial release of `action-fence`.
- Embedded rules for GitHub Actions workflow analysis:
  - `pin-actions`: Enforces SHA-1 pinning for third-party actions.
  - `workflow-permissions`: Validates presence of permissions scopes on GITHUB_TOKEN.
  - `command-injection`: Flags untrusted workflow context interpolation in shell run commands.
- Deterministic, local-first CLI and library exports.
- Full Vitest testing coverage.
