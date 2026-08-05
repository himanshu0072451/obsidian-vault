/**
 * Shared choreography constants for the Lock → Home unlock transition.
 *
 * The whole sequence is driven by ONE spring value (`unlockProgress`, owned
 * by LockScreen). Both LockScreen (glow/wordmark) and PasscodeInput
 * (dots/keypad) read that same value and derive their own layer's exit from
 * it via `unlockLayerProgress` — so all four layers stagger relative to each
 * other but can never drift out of sync, even though they're rendered from
 * two different components.
 *
 * Windows are [start, end] pairs along the 0→1 unlockProgress timeline.
 * Earlier windows exit first; later/wider windows exit last and slowest —
 * that's what produces the front-to-back depth ordering (glow first,
 * keypad last).
 */
export const UNLOCK_LAYER_WINDOWS = {
  glow: [0, 0.55],
  wordmark: [0.1, 0.7],
  dots: [0.2, 0.85],
  keypad: [0.3, 1],
} as const;

/** Maps `progress` (the shared 0→1 timeline) onto a layer's own local 0→1
 * window, clamped so it never runs before its start or past its end. */
export function unlockLayerProgress(
  progress: number,
  [start, end]: readonly [number, number],
): number {
  "worklet";
  if (end === start) return progress >= start ? 1 : 0;
  const t = (progress - start) / (end - start);
  return Math.min(1, Math.max(0, t));
}
