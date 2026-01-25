# CLAUDE.md

This file provides guidance to Claude Code and other AI agents working on this repository.

## Git Workflow (MUST FOLLOW)

### Branch Structure

```
main        → Production releases only (triggers auto-update)
dev         → Integration branch for testing before release
feature/*   → Feature branches (use worktrees)
```

### Feature Development with Worktrees

**Always use git worktrees for new features.** This allows parallel work without stashing.

```bash
# Create a new feature worktree
git worktree add ../FizzCC-feature-name -b feature/feature-name

# Work in the worktree directory
cd ../FizzCC-feature-name

# When done, merge to dev (from main repo)
cd ../FizzCC
git checkout dev
git merge feature/feature-name

# Clean up worktree
git worktree remove ../FizzCC-feature-name
git branch -d feature/feature-name
```

### Development Flow

1. **Start feature**: Create worktree from `dev` branch
2. **Develop**: Make changes, commit frequently
3. **Test locally**: Run `npm run dev` to verify
4. **Merge to dev**: PR or direct merge to `dev`
5. **Test dev build**: Run `npm run tauri build` on dev branch
6. **User click testing**: User manually tests the dev build before release
7. **Release**: Merge `dev` → `main` when ready for production

### Pre-Release Testing (REQUIRED)

**Never merge to main or cut a release without user approval after click testing.**

Before merging `dev` → `main`:
1. Build the app on dev branch: `npm run tauri build`
2. Ask the user to manually test the built app at `src-tauri/target/release/bundle/macos/WriteCraft.app`
3. Wait for explicit user confirmation that testing passed
4. Only then proceed with merge to main and release

This ensures no regressions ship to production via auto-update.

### Commit Workflow

```bash
# Before committing, run checks in parallel (use separate terminal or &)
npm run test:run & npm run lint & wait

# Commit with descriptive message
git add -A && git commit -m "feat: description"
```

## Build System

### Dev Build (Local Testing)

For testing features locally before merging:

```bash
# Quick dev build (no signing/notarization)
npm run tauri build

# Output: src-tauri/target/release/bundle/macos/WriteCraft.app
```

### Prod Build (Releases)

For production releases after merging to main:

```bash
# Full release build with signing + notarization + DMG
./bundle-macos.sh

# Outputs:
# - WriteCraft-{VERSION}.dmg (installer)
# - WriteCraft.app.tar.gz (auto-update archive)
# - latest.json (update manifest)
```

### Release Checklist

1. [ ] All features merged to `dev` and tested (unit tests + lint)
2. [ ] Dev build created: `npm run tauri build`
3. [ ] **User click testing completed and approved** ← REQUIRED
4. [ ] Version bumped in `src-tauri/tauri.conf.json`
5. [ ] `dev` merged to `main`
6. [ ] Run `./bundle-macos.sh` on main
7. [ ] Create GitHub release with tag `vX.Y.Z`
8. [ ] Upload: DMG, tar.gz, latest.json
9. [ ] Test auto-update from previous version

## Permissions

**NEVER create project-level `.claude/settings.json` or `.claude/settings.local.json` files.** All permissions are managed at the user level (`~/.claude/settings.json`). This prevents worktrees from having inconsistent permissions.

If you encounter permission prompts, inform the user to check their user-level settings rather than creating project-level overrides.

## Agent Behavior

### Parallel Execution (ALWAYS USE)

**Always maximize parallelization.** When tasks are independent, spawn multiple agents simultaneously in a single message using the Task tool. Never execute independent tasks sequentially.

Examples of when to parallelize:
- Searching for multiple patterns or files → spawn parallel Explore agents
- Fixing multiple independent bugs → spawn parallel agents for each
- Running tests + linting + type checking → all in parallel
- Researching multiple areas of the codebase → parallel Explore agents
- Implementing features in separate files → parallel implementation agents

### Task Autonomy

Agents should be fully autonomous. When spawning a Task:
- Provide complete context in the prompt so the agent can work independently
- Include relevant file paths, function names, and expected outcomes
- Let agents make decisions without requiring back-and-forth
- Trust agent results and only verify when there's reason for concern

### Agent Selection

Use the right agent type for each task:
- `Explore` - Codebase exploration, finding files, understanding architecture
- `Plan` - Designing implementation strategies for complex features
- `Bash` - Git operations, running commands, builds
- `general-purpose` - Multi-step implementation tasks, code changes

### Workflow Pattern

1. **Understand**: Use parallel Explore agents to gather context from multiple areas
2. **Plan**: For complex tasks, use Plan agent to design approach
3. **Execute**: Spawn parallel agents for independent implementation work
4. **Verify**: Run tests/lint/build in parallel after changes

## Build Commands

```bash
# Local development
npm run dev

# Production build
npm run tauri:build
```

## Project Structure

- `/src` - SvelteKit frontend
- `/src-tauri` - Rust/Tauri backend
- `/build` - Compiled frontend output (generated)

## Testing

```bash
npm run test:run    # Run tests once
npm run test        # Watch mode
```

## Linting

```bash
npm run lint        # Check for issues
npm run lint:fix    # Auto-fix issues
npm run format      # Format code
```

## Verification (Run in Parallel)

After making changes, always run these checks in parallel:
```bash
npm run test:run && npm run lint && npm run tauri:build
```
