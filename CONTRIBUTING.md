# Contributing to action-fence

First off, thank you for considering contributing to `action-fence`! It's people like you who make open source projects awesome.

## Development Workflow

This project is built using:

- **TypeScript** with strict compiler checks.
- **Vitest** for unit and integration testing.
- **tsup** for fast ESM packaging.
- **ESLint & Prettier** for code style.

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Running Commands

- **Code Formatting**: Check format with `npm run format:check` and apply with `npm run format`.
- **Linting**: Check code style issues with `npm run lint`.
- **Type Checking**: Verify TypeScript types using `npm run typecheck`.
- **Testing**: Run the Vitest test suite with `npm test`.
- **Building**: Bundle files into the `dist/` directory using `npm run build`.

## Pull Request Guidelines

1. Fork the repo and create your branch from `main`.
2. If you added code that should be tested, add tests.
3. Ensure the test suite passes (`npm test`).
4. Make sure your code lints and type-checks successfully (`npm run lint && npm run typecheck`).
5. Ensure your commit messages follow clean, conventional standards.
