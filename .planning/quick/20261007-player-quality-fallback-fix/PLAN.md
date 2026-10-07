# Quick Fix Plan — Player quality fallback

## Problem
On some Android devices, notably Huawei tablets, a Direct Play/Direct Stream decode failure switches FINORA to a forced H.264/AAC transcode. In the current planner, the forced mode is resolved before the selected quality profile, so later quality changes can be ignored. The forced transcode also omits explicit video resolution/bitrate constraints, allowing Jellyfin to choose a low-quality fallback. Stats for Nerds currently shows source resolution as if it were output resolution, which makes the issue hard to diagnose.

## Goal
Make quality selection authoritative even after compatibility fallback, keep Auto fallback visually high quality, and make diagnostics distinguish source from requested output.

## Changes
1. Refactor `playbackPlanner.ts` so forced transcode can still apply explicit quality constraints.
2. Give Auto compatibility fallback a source-aware high-quality ceiling instead of an unconstrained H.264 transcode.
3. Preserve Direct Play/Direct Stream behaviour when no fallback is needed.
4. Improve Stats for Nerds with selected/requested output quality, resolution and bitrate separate from source metadata.
5. Add regression tests for forced fallback + manual quality changes and fallback quality defaults.

## Validation
- TypeScript check
- playback planner unit tests
- full Jest suite through CI
- CodeQL
- production dependency audit
