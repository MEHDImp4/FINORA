import { Vibration, Platform } from "react-native";

export class HapticService {
  private enabled: boolean = true;

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Subtle light tap for regular button presses and card taps.
   */
  public impactLight(): void {
    if (!this.enabled) return;
    try {
      if (Platform.OS === "android") {
        Vibration.vibrate(10);
      } else if (Platform.OS === "ios") {
        Vibration.vibrate();
      }
    } catch {
      // Safe no-op on platforms without vibration or permissions
    }
  }

  /**
   * Medium impact for primary actions like Play, Pause, or Toggle Favorite.
   */
  public impactMedium(): void {
    if (!this.enabled) return;
    try {
      if (Platform.OS === "android") {
        Vibration.vibrate(25);
      } else {
        Vibration.vibrate();
      }
    } catch {
      // Safe no-op
    }
  }

  /**
   * Heavy impact for destructive actions or important milestones.
   */
  public impactHeavy(): void {
    if (!this.enabled) return;
    try {
      if (Platform.OS === "android") {
        Vibration.vibrate(40);
      } else {
        Vibration.vibrate();
      }
    } catch {
      // Safe no-op
    }
  }

  /**
   * Tick feedback for scrubbers and carousel item selection changes.
   */
  public selection(): void {
    if (!this.enabled) return;
    try {
      if (Platform.OS === "android") {
        Vibration.vibrate(5);
      } else {
        Vibration.vibrate();
      }
    } catch {
      // Safe no-op
    }
  }

  /**
   * Success notification pulse.
   */
  public notificationSuccess(): void {
    if (!this.enabled) return;
    try {
      if (Platform.OS === "android") {
        Vibration.vibrate([0, 15, 50, 20]);
      } else {
        Vibration.vibrate();
      }
    } catch {
      // Safe no-op
    }
  }

  /**
   * Error notification vibration pattern.
   */
  public notificationError(): void {
    if (!this.enabled) return;
    try {
      if (Platform.OS === "android") {
        Vibration.vibrate([0, 30, 80, 30]);
      } else {
        Vibration.vibrate();
      }
    } catch {
      // Safe no-op
    }
  }
}

export const hapticService = new HapticService();
