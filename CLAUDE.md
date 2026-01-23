# CLAUDE.md

This file provides guidance to Claude Code and other AI agents working on this repository.

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
