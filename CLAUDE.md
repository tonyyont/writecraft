# CLAUDE.md

This file provides guidance to Claude Code and other AI agents working on this repository.

## Build Commands

**Important**: Use `npm run tauri:build` instead of `npm run tauri build` for local macOS builds.

The project is in an iCloud-synced folder, which adds extended attributes (com.apple.provenance) to files. These break macOS codesigning. The `tauri:build` script handles this by:
1. Building with ad-hoc signing
2. Stripping extended attributes with `xattr -cr`
3. Re-signing with the Developer ID

```bash
# Local development
npm run dev

# Production build (use this!)
npm run tauri:build

# Do NOT use for local builds:
# npm run tauri build  # Will fail with codesigning errors
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
