---
status: complete
date: 2026-09-18
slug: fix-server-connect-modal-scroll-layout
---

# Quick Task Summary: Fix Server Connect Modal Scroll and Cut-Off Layout

## Summary
Resolved the issues where the "Changer de serveur" modal (`ServerConnectModal`) appeared cut off at the bottom and required multiple attempts to scroll.

### Root Causes Identified
1. **Touch Responder Arbitration Conflict**: The backdrop was a `<Pressable>` wrapping a `<Pressable style={styles.modalCard} onPress={e => e.stopPropagation()}>` which wrapped the `<ScrollView>`. The React Native `Pressable` responder system was intercepting initial touch gestures, preventing the inner `ScrollView` from receiving smooth pan gestures until repeated swipes broke through the responder lock.
2. **Unconstrained Percentage Height & Inset Clipping**: `modalCard` had `maxHeight: "85%"` inside a `KeyboardAvoidingView` parent that had no explicit height or flex bounds. In React Native's Yoga engine, percentage maxHeight on an unconstrained parent cannot calculate bounds accurately, causing the card to expand beyond the visible area. Furthermore, without taking safe area insets into account, the card's bottom and action button were pushed offscreen and clipped behind the screen navigation bar.
3. **Missing ScrollView Flex Shrink**: The `ScrollView` lacked `flexGrow: 0, flexShrink: 1`, preventing it from properly shrinking when its parent reached maximum container bounds.

### Key Changes
1. **Refactored Modal Layout Hierarchy**:
   - Replaced parent-wrapped `Pressable` with a clean `View` backdrop containing a background `Pressable style={StyleSheet.absoluteFill}` sibling for dismiss-on-backdrop.
   - Converted `modalCard` from `<Pressable>` to a clean `<View>`, removing `stopPropagation()` and enabling direct touch routing to the `ScrollView`.
2. **Window Dimensions & Safe Area Adaptation**:
   - Integrated `useWindowDimensions()` and `useSafeAreaInsets()`.
   - Computed dynamic `maxModalHeight = Math.max(320, Math.min(windowHeight * 0.82, windowHeight - insets.top - insets.bottom - 48))`.
   - Applied safe area insets on the backdrop padding (`paddingTop`, `paddingBottom`).
3. **Smooth Scrolling & Bottom Breathing Room**:
   - Added `styles.scrollView = { flexGrow: 0, flexShrink: 1 }` with `nestedScrollEnabled={true}` and `keyboardShouldPersistTaps="handled"`.
   - Added `paddingBottom: spacing.xl` to `styles.body` so action buttons and bottom content have clear clearance from the card edges.
4. **Consistency in `SwitchProfileModal.tsx`**:
   - Applied the same sibling backdrop Pressable, `View` card, dynamic height calculation, and `flexShrink: 1` `ScrollView` to profile switching.

## Verification
- `npm test src/features/settings/components/__tests__/`: All 8 tests in `ServerConnectModal.test.tsx` and `SwitchProfileModal.test.tsx` passed.
- `npx tsc --noEmit`: 0 TypeScript errors across the repository.
