# Contributing to WriteCraft

This guide helps you get started contributing to WriteCraft.

## Development Setup

### Prerequisites

- Node.js 18+
- Rust (for Tauri)
- pnpm or npm

### Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run Tauri development (desktop app)
npm run tauri dev
```

## Code Quality

### Linting and Formatting

We use ESLint and Prettier to maintain code quality:

```bash
# Check for lint errors
npm run lint

# Fix auto-fixable lint errors
npm run lint:fix

# Check formatting
npm run format:check

# Format all files
npm run format
```

### Pre-commit Hooks

Husky runs lint-staged on commit to ensure code quality. This automatically:
- Runs ESLint on staged `.ts` and `.svelte` files
- Runs Prettier on all staged files

### Type Checking

```bash
npm run check
```

## Testing

We use Vitest for testing:

```bash
# Run tests in watch mode
npm run test

# Run tests once
npm run test:run

# Run tests with coverage
npm run test:coverage
```

### Writing Tests

- Test files go next to the source files with `.test.ts` extension
- Use Vitest's `describe`, `it`, `expect` syntax
- Mock Tauri APIs using the setup in `src/lib/test-setup.ts`

Example:
```typescript
import { describe, it, expect } from 'vitest';
import { countWords } from './text';

describe('countWords', () => {
  it('counts words correctly', () => {
    expect(countWords('hello world')).toBe(2);
  });
});
```

## Project Structure

```
src/
├── lib/
│   ├── components/     # Svelte components
│   ├── stores/         # Svelte stores (state management)
│   ├── services/       # API and external service integrations
│   ├── tools/          # AI tool definitions and executor
│   ├── types/          # TypeScript type definitions
│   └── utils/          # Shared utility functions
├── routes/             # SvelteKit routes
└── app.html            # HTML template
```

### Key Conventions

1. **Svelte 5 Runes**: Use `$state`, `$derived`, `$effect` for reactivity
2. **Type Safety**: Use TypeScript strictly, validate inputs with Zod
3. **Error Handling**: Use custom error classes from `utils/errors.ts`
4. **Text Utilities**: Use functions from `utils/text.ts` for word counting, truncation

## Making Changes

### Branches

- `main` - production-ready code
- Feature branches - `feature/your-feature-name`
- Bug fixes - `fix/bug-description`

### Pull Requests

1. Create a feature branch
2. Make your changes
3. Ensure tests pass: `npm run test:run`
4. Ensure linting passes: `npm run lint`
5. Ensure types are correct: `npm run check`
6. Submit a pull request

### Commit Messages

Use clear, descriptive commit messages:
- `feat: add new feature`
- `fix: resolve bug in X`
- `refactor: improve Y structure`
- `test: add tests for Z`
- `docs: update documentation`

## Architecture Notes

### State Management

State is managed through Svelte stores in `src/lib/stores/`:
- `document.svelte.ts` - Current document state
- `chat.svelte.ts` - Chat/conversation state
- `auth.svelte.ts` - Authentication and user state

### Tool System

The AI uses tools defined in `src/lib/tools/`:
- `definitions.ts` - Tool schemas for Claude
- `schemas.ts` - Zod validation schemas
- `executor.ts` - Tool execution logic

### Tauri Integration

Desktop functionality is handled through Tauri:
- `src-tauri/` - Rust backend code
- File operations use Tauri APIs
- Platform-specific features are in Rust commands

## Questions?

Open an issue if you have questions or need help getting started.
