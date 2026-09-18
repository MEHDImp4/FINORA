# Quick Task: Fix Server Connect Modal Layout and Scroll Glitch

## Problem
In Settings, the "Changer de serveur" modal (`ServerConnectModal`) has two critical UX bugs:
1. **Cut-off at bottom ("découpée en bas")**: The modal card is clipped or pushed offscreen at the bottom because `modalCard` uses `maxHeight: "85%"` inside an unconstrained parent, lacking proper window height bounds and safe area insets. The `ScrollView` has no `flexShrink: 1` or proper bottom padding, causing content to overflow and clip outside the rounded card.
2. **Scroll unresponsiveness ("peux pas scroll toujours, scroll plusieurs fois")**: The backdrop and modal card were nested `<Pressable>` components (`<Pressable style={styles.backdrop}><Pressable style={styles.modalCard} onPress={e => e.stopPropagation()}>`). React Native's gesture responder on the parent Pressable intercepts touch gestures, causing severe responder arbitration conflicts with the inner `ScrollView`.

## Scope & Changes
1. **Refactor modal backdrop and card hierarchy in `ServerConnectModal.tsx`**:
   - Separate the backdrop overlay from the card container: use an absolute fill `Pressable` sibling behind the card for dismissal instead of wrapping the card in a Pressable.
   - Change `modalCard` from `<Pressable>` to `<View>` to completely eliminate gesture responder conflicts.
   - Use `useWindowDimensions()` and `useSafeAreaInsets()` to compute a precise `maxModalHeight` that accounts for status bars and navigation bar insets.
   - Add `style={styles.scrollView}` with `flexGrow: 0, flexShrink: 1` so the ScrollView properly shrinks and scrolls smoothly.
   - Increase bottom content padding (`paddingBottom: spacing.xl`) so action buttons and bottom content have proper breathing room.
2. **Apply the same robust backdrop/card pattern to `SwitchProfileModal.tsx`** to ensure consistent modal behavior across settings.
3. **Verify with existing test suites and add verification tests**.
