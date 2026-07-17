# Architecture

ActionFence has a lightweight, deterministic validation pipeline. Each layer does one thing so that the security checks are predictable, fast, and local-first.

```text
cli.ts
  -> scanner.ts (Scanner)
      -> file reader (Local FS)
      -> yaml parser (yaml)
      -> rules/* (Pure Rule Functions)
  -> cli.ts (Reporter & Exit Code Mapper)
```

## Boundaries

| Layer    | Responsibility                                                                                         |
| -------- | ------------------------------------------------------------------------------------------------------ |
| CLI      | Parses command line arguments, handles options (`--format`, `--rules`), and maps errors to exit codes. |
| Scanner  | Discovers target workflow files, reads content, parses YAML safely, and executes active rules.         |
| Rules    | Pure functions evaluating specific parts of the workflow configuration and returning finding objects.  |
| Reporter | Prints findings to standard output formatted as human-readable text or structured JSON.                |

## Exit Codes

ActionFence uses stable exit codes to allow pipelines to react to specific failure classes:

| Exit code | Meaning                                                         |
| --------- | --------------------------------------------------------------- |
| `0`       | Completion successful; no errors found (warnings are bypassed). |
| `1`       | Completion successful; one or more security rule errors found.  |
| `2`       | CLI arguments or configurations are invalid.                    |
| `3`       | File reading, YAML parsing, or input structural safety error.   |
| `70`      | Unhandled internal tool error.                                  |

## Security Model

Workflows are loaded purely from local files. The scanner does not fetch remote action details, query github.com, or access the network. This keeps executions isolated and secure.
Any missing files or syntax errors in YAML are captured cleanly as scanner errors (which exit with code `3`) rather than crashing the tool, ensuring stability in CI pipelines.
