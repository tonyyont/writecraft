# Phase 6: Outline Prompts + Polish + Packaging

## Objective
Add stage-specific outline generation, polish the UI, and prepare for macOS distribution.

## Dependencies
- Phase 5 complete

## Tasks

### 6.1 Stage Transitions
Create src/lib/components/Sidebar/StageSelector.svelte:
- Visual pipeline: idea → concept → outline → draft → edits → polish
- Click to change stage
- Confirmation dialog when moving backward
- Stage change triggers sidecar update
- Visual indicator for current stage

### 6.2 Outline Generation
Create src/lib/prompts/outline.ts:
- buildOutlinePrompt(conceptText, documentType) -> string
- Generate 5-7 section prompts
- Include estimated word counts
- Support regeneration with alternatives

### 6.3 Quick Actions
Create src/lib/components/Chat/QuickActions.svelte:
Stage-specific action buttons:
- idea: "Brainstorm", "Clarify", "Expand"
- concept: "Structure", "Identify gaps", "Simplify"
- outline: "Generate outline", "Reorder", "Add detail"
- draft: "Write section", "Expand", "Transition"
- edits: "Review", "Tighten", "Vary sentences"
- polish: "Final check", "Tone adjust", "Format"

### 6.4 UI Polish
- Consistent color scheme (CSS variables in app.css)
- Loading states and skeleton screens
- Error boundaries with retry options
- Keyboard shortcuts help panel (Cmd+/)
- Responsive layout (min-width constraints)
- Dark mode support (prefers-color-scheme)

### 6.5 Error Handling
- Network errors: Retry with exponential backoff
- API errors: User-friendly messages with action suggestions
- File errors: Recovery options (reload, discard changes)
- Corrupt sidecar: Auto-repair or reset option

### 6.6 Tauri Packaging
Update tauri.conf.json for distribution:
- Set bundle.active = true
- Configure bundle.targets for macOS (dmg, app)
- Set minimum macOS version (10.15+)
- Add app icons

### 6.7 Documentation
Create README.md with:
- Project overview
- Installation instructions
- Usage guide
- API key setup walkthrough
- Known limitations
- Development setup

## Acceptance Criteria
1. Stage selector works with visual feedback
2. Outline generation produces usable markdown outline
3. Quick actions trigger appropriate stage-specific prompts
4. Dark mode toggles correctly based on system preference
5. Error states display user-friendly messages with recovery actions
6. `npm run tauri build` produces working .dmg
7. App launches from .dmg on clean macOS system
8. README documents all features
9. No console errors in production build

## Completion Promise
When all acceptance criteria pass, output: <promise>PHASE_6_COMPLETE</promise>
