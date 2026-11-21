// Mobile Haptic Vibration Utilities for "The Krampus Eve" (/play)
// Gracefully degrades on desktop or browsers without vibration support

export type HapticType = 'SUBMIT' | 'BUZZER' | 'CONFIRM' | 'PANIC' | 'ERROR';

export function triggerHaptic(type: HapticType): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined' || !('vibrate' in navigator)) {
    return false;
  }

  try {
    switch (type) {
      case 'SUBMIT':
        // Crisp double tap
        return navigator.vibrate([40, 30, 60]);
      case 'BUZZER':
        // Strong electric punch
        return navigator.vibrate([120, 40, 160]);
      case 'CONFIRM':
        // Gentle single confirmation pulse
        return navigator.vibrate(50);
      case 'PANIC':
        // Quick urgency flutter (e.g. 5 seconds left)
        return navigator.vibrate([70, 50, 70]);
      case 'ERROR':
        // Stumble vibration
        return navigator.vibrate([90, 60, 90, 60, 120]);
      default:
        return false;
    }
  } catch (_) {
    return false;
  }
}
