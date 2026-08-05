/**
 * useUnlockTransition — shared lifecycle for the Lock → Home unlock
 * choreography's driving state, extracted from LockScreen and
 * CamouflageCalculator (which had identically duplicated it).
 *
 * Owns exactly: the `unlockProgress` shared value, the double-fire guard,
 * the mounted guard, the relock-reset fix, and unmount cleanup. It knows
 * nothing about *how* progress is animated (spring vs timing, duration,
 * damping) or what any layer does with it — that stays with each screen,
 * passed in via `driveProgress`.
 */

import { useCallback, useEffect, useRef } from "react";
import {
  useSharedValue,
  cancelAnimation,
  runOnJS,
  SharedValue,
} from "react-native-reanimated";
import { useAuth } from "./useAuth";

type FinishedCallback = (finished?: boolean) => void;

interface UseUnlockTransitionOptions {
  /** Called the instant the sequence begins — tells the parent to start
   * rendering HomeScreen underneath while this screen is still on top. */
  onUnlockTransitionStart: () => void;
  /** Called once the exit animation has fully settled — tells the parent
   * it's safe to unmount this screen. */
  onUnlockTransitionEnd: () => void;
  /**
   * Drives `unlockProgress` from 0 to 1 with whatever animation the caller
   * wants (spring, timing, etc). Must pass `onFinished` through as the
   * animation's own completion callback unchanged — it already carries the
   * mounted-guard check and the runOnJS hop needed to safely call back into
   * onUnlockTransitionEnd from the UI thread.
   */
  driveProgress: (
    unlockProgress: SharedValue<number>,
    onFinished: FinishedCallback,
  ) => void;
}

interface UseUnlockTransitionResult {
  unlockProgress: SharedValue<number>;
  /** Guards against ever starting the sequence twice; also safe to read
   * directly (e.g. "already mid-transition — ignore this attempt"). */
  hasUnlockedRef: React.MutableRefObject<boolean>;
  runUnlockSequence: () => void;
}

export function useUnlockTransition({
  onUnlockTransitionStart,
  onUnlockTransitionEnd,
  driveProgress,
}: UseUnlockTransitionOptions): UseUnlockTransitionResult {
  const { isUnlocked } = useAuth();

  const unlockProgress = useSharedValue(0);
  // Guards against ever starting the sequence twice (rapid double-tap on
  // the biometric button, or any other double-invocation).
  const hasUnlockedRef = useRef(false);
  // Read from a UI-thread animation-completion worklet, so it must be a
  // shared value, not a plain ref — a ref's `.current` wouldn't reflect
  // live JS-thread state inside a worklet. Set false on unmount so a
  // completion callback arriving after this screen is gone can't call
  // back into a dead parent.
  const isMountedShared = useSharedValue(true);

  useEffect(() => {
    return () => {
      isMountedShared.value = false;
      cancelAnimation(unlockProgress);
    };
  }, []);

  // If the app re-locks while this exact screen instance is still mounted
  // (e.g. backgrounded mid-transition with "lock on background" enabled,
  // then relocked before onUnlockTransitionEnd ever fired) — hasUnlockedRef
  // and unlockProgress must reset, or the NEXT correct passcode/biometric
  // attempt would see hasUnlockedRef already true and silently no-op
  // forever, locking the user out until app restart.
  useEffect(() => {
    if (!isUnlocked) {
      hasUnlockedRef.current = false;
      cancelAnimation(unlockProgress);
      unlockProgress.value = 0;
    }
  }, [isUnlocked]);

  const runUnlockSequence = useCallback(() => {
    if (hasUnlockedRef.current) return; // never fire twice
    hasUnlockedRef.current = true;
    onUnlockTransitionStart();
    const onFinished: FinishedCallback = (finished) => {
      "worklet";
      if (finished && isMountedShared.value) {
        runOnJS(onUnlockTransitionEnd)();
      }
    };
    driveProgress(unlockProgress, onFinished);
  }, [onUnlockTransitionStart, onUnlockTransitionEnd, driveProgress]);

  return { unlockProgress, hasUnlockedRef, runUnlockSequence };
}
