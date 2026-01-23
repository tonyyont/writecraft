# Code Quality Improvement Plan

## Executive Summary

This document outlines a comprehensive plan to improve the code quality of WriteCraft, a macOS writing application built with SvelteKit, Tauri (Rust), and Supabase. The improvements are prioritized by impact and organized into phases.

**Current State**: The codebase is functional and well-architected at a high level, but lacks several engineering best practices that would improve maintainability, testability, and developer experience.

---

## Priority 1: Critical Infrastructure (Foundation)

### 1.1 Add Linting Configuration

**Problem**: No ESLint configuration exists. Code style is inconsistent across files.

**Solution**:
- Add ESLint with TypeScript and Svelte plugins
- Configure rules for consistent code style
- Add import sorting rules

**Files to create**:
- `eslint.config.js` - ESLint flat config
- Update `package.json` with lint scripts

**Impact**: Prevents bugs, enforces consistency, catches issues early.

---

### 1.2 Add Code Formatting

**Problem**: No Prettier configuration. Formatting is manual and inconsistent.

**Solution**:
- Add Prettier with Svelte plugin
- Configure consistent formatting rules
- Add format scripts

**Files to create**:
- `.prettierrc`
- `.prettierignore`
- Update `package.json` with format scripts

**Impact**: Eliminates formatting debates, consistent code style.

---

### 1.3 Add Pre-commit Hooks

**Problem**: No automated quality gates before commits.

**Solution**:
- Add Husky for git hooks
- Add lint-staged for running checks on staged files
- Run lint + format on pre-commit

**Files to create**:
- `.husky/pre-commit`
- Update `package.json` with husky and lint-staged config

**Impact**: Prevents bad code from entering the repository.

---

### 1.4 Add Testing Infrastructure

**Problem**: Zero test files exist. Critical business logic is untested.

**Solution**:
- Add Vitest for frontend testing
- Configure test environment
- Add test scripts

**Files to create**:
- `vitest.config.ts`
- `src/lib/test-setup.ts`
- Update `package.json` with test scripts

**Impact**: Enables confidence in refactoring, catches regressions.

---

## Priority 2: Code Organization (Architecture)

### 2.1 Extract Agent Orchestration from ChatPanel

**Problem**: `ChatPanel.svelte` (636 lines) mixes UI, agent loop, and prompt building.

**Current structure**:
```
ChatPanel.svelte
├── UI rendering (350 lines)
├── Agent orchestration loop (120 lines)
├── System prompt building (70 lines)
├── Resize handling (30 lines)
└── Error handling (50 lines)
```

**Solution**: Extract into focused modules:

**Files to create**:
- `src/lib/services/agent.ts` - Agent orchestration loop
- `src/lib/services/promptBuilder.ts` - System prompt construction

**Refactor**:
- `ChatPanel.svelte` - UI only (~300 lines)

**Impact**: Testable agent logic, cleaner component, reusable prompt builder.

---

### 2.2 Split Auth Store into Focused Stores

**Problem**: `auth.svelte.ts` (370 lines) handles 5 different concerns:
- Authentication state
- Profile management
- Subscription info
- Usage tracking
- Billing operations

**Solution**: Split into focused stores:

**Files to create**:
- `src/lib/stores/session.svelte.ts` - Auth session only (~100 lines)
- `src/lib/stores/profile.svelte.ts` - Profile management (~60 lines)
- `src/lib/stores/subscription.svelte.ts` - Subscription + usage (~100 lines)
- `src/lib/stores/billing.svelte.ts` - Billing operations (~50 lines)

**Delete**:
- `src/lib/stores/auth.svelte.ts` (replaced by above)

**Create facade** (optional):
- `src/lib/stores/auth.ts` - Re-exports for backwards compatibility

**Impact**: Single responsibility, easier testing, clearer dependencies.

---

### 2.3 Standardize Store Pattern

**Problem**: Inconsistent store patterns:
- `authStore` uses class syntax
- `documentStore` uses object with getter functions
- `apiKeyStore` uses class syntax
- `chatStore` uses object with getter functions

**Solution**: Standardize on object-with-getters pattern (matches Svelte 5 runes best):

**Files to refactor**:
- `src/lib/stores/apiKey.svelte.ts` - Convert from class to object pattern

**Impact**: Consistent patterns, easier to understand.

---

### 2.4 Extract Shared Utilities

**Problem**: Duplicated logic across files:
- Word counting: appears in 3+ places
- Error message extraction: `e instanceof Error ? e.message : String(e)` everywhere
- JSON error wrapping in tool executor

**Solution**: Create utility modules:

**Files to create**:
- `src/lib/utils/text.ts` - Text utilities (word count, truncate, etc.)
- `src/lib/utils/errors.ts` - Error handling utilities

**Impact**: DRY code, consistent behavior, single source of truth.

---

## Priority 3: Type Safety (Correctness)

### 3.1 Add Runtime Validation for Tool Inputs

**Problem**: Tool inputs from Claude are cast with `as unknown` then to specific types without validation. Malformed inputs could cause runtime errors.

**Current code** (`executor.ts:11`):
```typescript
const input = toolUse.input as unknown;
// ... later ...
return executeUpdateDocument(toolUse.id, input as UpdateDocumentInput);
```

**Solution**: Add Zod schemas for validation:

**Files to create**:
- `src/lib/tools/schemas.ts` - Zod schemas for all tool inputs

**Refactor**:
- `src/lib/tools/executor.ts` - Validate before executing

**Impact**: Runtime safety, better error messages, self-documenting schemas.

---

### 3.2 Add Custom Error Classes

**Problem**: All errors are generic `Error` or strings. No distinction between error types.

**Solution**: Create domain-specific error classes:

**Files to create**:
- `src/lib/errors/index.ts` - Custom error classes

```typescript
export class DocumentError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'DocumentError';
  }
}

export class AuthError extends Error { ... }
export class ApiError extends Error { ... }
export class ValidationError extends Error { ... }
```

**Impact**: Better error handling, clearer debugging, type-safe error checks.

---

### 3.3 Type Edge Function Responses

**Problem**: Edge function responses aren't fully typed. Relies on `any` and manual checks.

**Solution**: Create shared type definitions:

**Files to create**:
- `supabase/functions/_shared/types.ts` - Shared response types

**Impact**: Type safety across frontend-backend boundary.

---

## Priority 4: Error Handling (Robustness)

### 4.1 Standardize Error Handling Pattern

**Problem**: Inconsistent error handling:
- Some places log errors, others don't
- Some places set error state, others throw
- Silent failures in some stores (e.g., `recents.svelte.ts`)

**Solution**: Establish error handling conventions:

1. **Store errors**: Always set error state, optionally re-throw
2. **Service errors**: Always throw, let caller handle
3. **Component errors**: Catch and display to user
4. **Silent failures**: Add logging at minimum

**Files to refactor**:
- `src/lib/stores/recents.svelte.ts` - Add logging to catch blocks
- `src/lib/stores/document.svelte.ts` - Consistent error state management

**Impact**: Debuggable errors, consistent user experience.

---

### 4.2 Add Error Boundary Component

**Problem**: No global error handling for component crashes.

**Solution**: Create error boundary wrapper:

**Files to create**:
- `src/lib/components/ErrorBoundary.svelte`

**Impact**: Graceful degradation, user-friendly error display.

---

## Priority 5: Testing (Confidence)

### 5.1 Add Unit Tests for Utilities

**Problem**: Critical utilities (diff, conflicts, text) have no tests.

**Files to create**:
- `src/lib/utils/diff.test.ts`
- `src/lib/utils/conflicts.test.ts`
- `src/lib/utils/text.test.ts`
- `src/lib/utils/errors.test.ts`

**Impact**: Confidence in core logic, regression protection.

---

### 5.2 Add Unit Tests for Tool Executor

**Problem**: Tool execution is untested despite being critical path.

**Files to create**:
- `src/lib/tools/executor.test.ts`
- `src/lib/tools/schemas.test.ts`

**Impact**: Confidence in AI tool handling.

---

### 5.3 Add Store Tests

**Problem**: Store logic is complex but untested.

**Files to create**:
- `src/lib/stores/document.test.ts`
- `src/lib/stores/chat.test.ts`

**Impact**: Confidence in state management.

---

## Priority 6: Documentation (Onboarding)

### 6.1 Add CONTRIBUTING.md

**Problem**: No documented conventions for contributors.

**Files to create**:
- `CONTRIBUTING.md`

**Contents**:
- Code style guide
- Commit message conventions
- PR process
- Development workflow
- Architecture overview

**Impact**: Faster onboarding, consistent contributions.

---

### 6.2 Add JSDoc to Stores and Services

**Problem**: Sparse documentation in store files. Functions lack JSDoc.

**Files to update**:
- `src/lib/stores/document.svelte.ts` - Add JSDoc to all exports
- `src/lib/stores/chat.svelte.ts` - Add JSDoc to all exports
- `src/lib/services/claude.ts` - Add JSDoc to exports

**Impact**: Self-documenting code, better IDE support.

---

### 6.3 Document Rust Commands

**Problem**: Rust IPC commands have minimal documentation.

**Files to update**:
- `src-tauri/src/commands/claude.rs` - Add doc comments
- `src-tauri/src/commands/auth.rs` - Add doc comments
- `src-tauri/src/commands/file.rs` - Add doc comments

**Impact**: Clearer backend contract, easier debugging.

---

## Implementation Order

### Phase 1: Foundation (Days 1-2)
1. Add ESLint configuration
2. Add Prettier configuration
3. Add pre-commit hooks
4. Add Vitest configuration
5. Run lint --fix on entire codebase

### Phase 2: Quick Wins (Days 3-4)
1. Extract shared utilities (text, errors)
2. Add custom error classes
3. Add Zod schemas for tool validation
4. Fix inconsistent store patterns

### Phase 3: Major Refactors (Days 5-7)
1. Extract agent orchestration from ChatPanel
2. Split auth store into focused stores
3. Standardize error handling

### Phase 4: Testing (Days 8-10)
1. Add utility tests (diff, conflicts, text)
2. Add tool executor tests
3. Add store tests

### Phase 5: Documentation (Days 11-12)
1. Create CONTRIBUTING.md
2. Add JSDoc to stores and services
3. Document Rust commands

---

## Files Summary

### New Files to Create
```
eslint.config.js
.prettierrc
.prettierignore
.husky/pre-commit
vitest.config.ts
CONTRIBUTING.md

src/lib/test-setup.ts
src/lib/services/agent.ts
src/lib/services/promptBuilder.ts
src/lib/stores/session.svelte.ts
src/lib/stores/profile.svelte.ts
src/lib/stores/subscription.svelte.ts
src/lib/stores/billing.svelte.ts
src/lib/utils/text.ts
src/lib/utils/errors.ts
src/lib/tools/schemas.ts
src/lib/errors/index.ts
src/lib/components/ErrorBoundary.svelte

supabase/functions/_shared/types.ts

src/lib/utils/diff.test.ts
src/lib/utils/conflicts.test.ts
src/lib/utils/text.test.ts
src/lib/utils/errors.test.ts
src/lib/tools/executor.test.ts
src/lib/tools/schemas.test.ts
src/lib/stores/document.test.ts
src/lib/stores/chat.test.ts
```

### Files to Refactor
```
src/lib/components/Chat/ChatPanel.svelte (extract logic)
src/lib/stores/auth.svelte.ts (split into multiple)
src/lib/stores/apiKey.svelte.ts (standardize pattern)
src/lib/stores/recents.svelte.ts (add error logging)
src/lib/stores/document.svelte.ts (error handling + JSDoc)
src/lib/stores/chat.svelte.ts (JSDoc)
src/lib/tools/executor.ts (add validation)
src/lib/services/claude.ts (JSDoc)
src-tauri/src/commands/claude.rs (doc comments)
src-tauri/src/commands/auth.rs (doc comments)
src-tauri/src/commands/file.rs (doc comments)
package.json (add scripts and deps)
```

---

## Success Metrics

After implementation:
- [ ] `npm run lint` passes with zero errors
- [ ] `npm run format:check` passes
- [ ] `npm test` runs with >80% coverage on utilities
- [ ] Pre-commit hooks prevent bad commits
- [ ] All public functions have JSDoc
- [ ] CONTRIBUTING.md exists and is comprehensive
- [ ] ChatPanel.svelte is <400 lines
- [ ] Auth concerns are split into 4 stores
- [ ] Tool inputs are validated with Zod
- [ ] Custom error classes exist for all domains
