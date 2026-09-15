# FINORA V1 UI/UX Polishing

## Goal
Polish the existing FINORA V1 interface without redesigning the product or destabilizing playback/offline behavior.

## Scope
- Standardize visible V1 copy in French on the primary user flows.
- Improve minimum touch targets and text contrast.
- Make Search a primary tab while keeping Downloads secondary.
- Make Home hero/category navigation safer on small phones and reduce automatic hero rotation pressure.
- Add confirmation/safer handling for destructive download/account/notification actions.
- Simplify notification and multi-account presentation.
- Reduce player top-bar crowding while preserving all capabilities.
- Remove the misleading unauthenticated onboarding exit and tighten onboarding copy.
- Preserve FINORA dark cinematic identity, existing architecture, playback, offline and notification behavior.

## Acceptance
- No new feature scope.
- TypeScript strict passes.
- Jest passes.
- Existing player/download/navigation behavior remains intact.
- Primary interactive controls have >=44px effective touch targets where practical.
- Destructive actions require explicit confirmation or safe undo behavior.
- Small-screen layouts avoid fixed-width CTA overflow.
- PR reviewed through CI before merge.
