/**
 * ImageViewer — immersive fullscreen image viewer
 *
 * Features:
 *   • Thumbnail-first opening — shows the already-cached thumbnail
 *     instantly, crossfades to the full-resolution image once it decodes.
 *     Never a blank or blocking screen while decrypting.
 *   • Pinch-to-zoom (0.5× – 6×) with spring snap-back
 *   • Double-tap zoom toggle (1× ↔ 3×) at tap point
 *   • Momentum panning with edge clamping
 *   • Swipe-down-to-close with velocity threshold
 *   • Auto-hiding chrome after 3s inactivity
 *   • Tap to toggle chrome visibility
 *   • Glassmorphic monochrome header
 *   • Hidden status bar while open
 *   • Fade transition in/out
 *   • All gestures on UI thread via Reanimated worklets
 */

import React, { useCallback, useEffect, useRef, useState, memo } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  StatusBar,
  Text,
  Pressable,
  Platform,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  BackHandler,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withDecay,
  withSequence,
  runOnJS,
  clamp,
  Easing,
  cancelAnimation,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import type { VaultFile } from "../services/storage";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImageViewerProps {
  visible: boolean;
  /** Already-cached (usually instant) preview — shown immediately so the
   * viewer never opens to a blank screen while the full image decrypts. */
  thumbUri: string | null;
  /** Full-resolution decrypted image. Null until decryption finishes; the
   * viewer crossfades to it once available. */
  imageUri: string | null;
  /** True while the full-resolution decrypt is still running in the
   * background. Drives a subtle delayed loading indicator only. */
  loadingFull?: boolean;
  /** Full metadata for the bottom bar (date/size/album/tags) and the top
   * bar's favorite/more actions. Null while nothing is being previewed. */
  file: VaultFile | null;
  onClose: () => void;
  onToggleFavorite: (file: VaultFile) => void;
  onOpenMoveSheet: (file: VaultFile) => void;
  onOpenTagSheet: (file: VaultFile) => void;
  onDelete: (file: VaultFile) => void;
  onExportToGallery: (file: VaultFile) => void;
}

// ─── Formatting helpers ─────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

function formatFullDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Only show a loading indicator if the full-resolution decrypt takes longer
// than this — most files resolve well under it, so the indicator normally
// never appears at all.
const SLOW_LOAD_THRESHOLD = 400;

// ─── Constants ────────────────────────────────────────────────────────────────

const SCREEN = Dimensions.get("window");
const MIN_SCALE = 0.8;
const MAX_SCALE = 6;
const DOUBLE_TAP_ZOOM = 3;
const SWIPE_CLOSE_VELOCITY = 800; // px/s downward velocity to trigger close
const SWIPE_CLOSE_DISTANCE = 120; // or this many px down at any velocity
const CHROME_HIDE_DELAY = 3000; // ms until chrome auto-hides
const SPRING_CONFIG = { damping: 22, stiffness: 280, mass: 0.8 };
const SPRING_SOFT = { damping: 30, stiffness: 200, mass: 1 };
const BUTTON_PRESS_SCALE = 0.92;

// ─── ChromeButton ───────────────────────────────────────────────────────────
// Shared press treatment for every chrome control (back, favorite, more,
// more-menu items) — slight scale + opacity dip on press-in, spring back on
// release, plus a soft haptic. One place for this instead of re-implementing
// press feedback per button.

interface ChromeButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  style?: ViewStyle | (ViewStyle | undefined | false)[];
  accessibilityLabel: string;
  hitSlop?: { top: number; bottom: number; left: number; right: number };
  haptic?: Haptics.ImpactFeedbackStyle;
}

function ChromeButton({
  onPress,
  children,
  style,
  accessibilityLabel,
  hitSlop,
  haptic = Haptics.ImpactFeedbackStyle.Light,
}: ChromeButtonProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withTiming(BUTTON_PRESS_SCALE, { duration: 90 });
    opacity.value = withTiming(0.7, { duration: 90 });
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, SPRING_CONFIG);
    opacity.value = withTiming(1, { duration: 150 });
  }, []);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(haptic).catch(() => {});
    onPress();
  }, [onPress, haptic]);

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={style}
        hitSlop={hitSlop}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

// ─── FavoriteGlyph ──────────────────────────────────────────────────────────
// Matches the star pop already used on HomeScreen's VaultFileCard — was
// missing here, so the two favorite affordances felt inconsistent.

function FavoriteGlyph({ active }: { active: boolean }) {
  const starScale = useSharedValue(1);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Only the toggle should pop — not the initial mount when the viewer
    // opens on an already-favorited file.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    starScale.value = withSequence(
      withSpring(1.15, { damping: 14, stiffness: 300 }),
      withSpring(1, { damping: 16, stiffness: 300 }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const starStyle = useAnimatedStyle(() => ({
    transform: [{ scale: starScale.value }],
  }));

  return (
    <Animated.Text
      style={[styles.iconBtnText, active && styles.iconBtnTextActive, starStyle]}
    >
      {active ? "★" : "☆"}
    </Animated.Text>
  );
}

// ─── ImageViewer ─────────────────────────────────────────────────────────────

export default memo(function ImageViewer({
  visible,
  thumbUri,
  imageUri,
  loadingFull,
  file,
  onClose,
  onToggleFavorite,
  onOpenMoveSheet,
  onOpenTagSheet,
  onDelete,
  onExportToGallery,
}: ImageViewerProps) {
  const [moreMenuVisible, setMoreMenuVisible] = useState(false);

  // Visibility fade
  // const backdropOpacity = useSharedValue(0);
  const backdropOpacity = useSharedValue(1);
  // Thumbnail fades in first (near-instant, already cached); the
  // full-resolution image fades in on top of it once it decodes.
  const thumbOpacity = useSharedValue(0);
  const imageOpacity = useSharedValue(0);
  const [showSlowLoadIndicator, setShowSlowLoadIndicator] = useState(false);

  // Transform state
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  // Swipe-to-close state (separate from pan so they don't conflict)
  const swipeY = useSharedValue(0);
  const isSwipingToClose = useSharedValue(false);

  // Open/close pop: springs from 0.92→1 on open, eases down slightly on
  // close. Composes with (multiplies into) the drag-shrink below and the
  // user's own pinch-zoom scale, since it lives on the outer container.
  const openScale = useSharedValue(0.92);

  // Chrome (header/hint) visibility
  const chromeOpacity = useSharedValue(1);
  const [chromeVisible, setChromeVisible] = useState(true);
  const chromeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Double-tap tracking
  const lastTapTime = useSharedValue(0);
  const lastTapX = useSharedValue(0);
  const lastTapY = useSharedValue(0);

  // ─── Android hardware back button ───────────────────────────────────────
  // With nothing listening, Android's hardware back press falls through to
  // whatever's underneath this overlay (HomeScreen), since this viewer is a
  // plain absolutely-positioned View, not a screen in a navigation stack or
  // a native Modal — neither of which intercepts hardware back on their
  // own here. Only registered while the viewer is actually visible, and
  // returning `true` from the handler consumes the event so it stops right
  // here instead of also closing/backing out whatever's underneath. Same
  // close path as the header's back-chevron button (onClose), so behavior
  // stays identical to every other way of closing the viewer.
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  // ─── Open/close animation ──────────────────────────────────────────────

  useEffect(() => {
    // console.log(
    //   "[IV] ImageViewer RENDER",
    //   {
    //     visible,
    //     hasUri: !!imageUri,
    //     imageOpacity: imageOpacity.value,
    //     backdropOpacity: backdropOpacity.value,
    //   },
    //   Date.now(),
    // );
    if (visible) {
      // console.log(
      //   "[IV] 4. useEffect([visible]) fired, visible=",
      //   visible,
      //   Date.now(),
      // );
      // Cancel any in-flight animations before resetting — bare assignment
      // does not stop UI-thread worklets (withDecay, withSpring).
      cancelAnimation(scale);
      cancelAnimation(translateX);
      cancelAnimation(translateY);
      cancelAnimation(swipeY);
      cancelAnimation(backdropOpacity);
      cancelAnimation(imageOpacity);
      cancelAnimation(openScale);

      // Reset all transform state
      scale.value = 1;
      savedScale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      savedX.value = 0;
      savedY.value = 0;
      swipeY.value = 0;
      isSwipingToClose.value = false;
      setMoreMenuVisible(false);

      // Thumbnail (already cached, usually instant) fades in right away;
      // the full-resolution image is a separate layer that only fades in
      // once it actually finishes decoding — see handleFullImageLoad below.
      cancelAnimation(thumbOpacity);
      imageOpacity.value = 0;
      thumbOpacity.value = withTiming(1, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      });

      // Gentle spring pop-in, Apple-Photos style — not a linear fade alone.
      openScale.value = 0.92;
      openScale.value = withSpring(1, {
        damping: 26,
        stiffness: 260,
        mass: 0.9,
      });

      // Start chrome hide timer
      scheduleChromeHide();
    } else {
      clearChromeTimer();
      setMoreMenuVisible(false);
      chromeOpacity.value = withTiming(0, { duration: 150 });
      backdropOpacity.value = withTiming(0, { duration: 200 });
      thumbOpacity.value = withTiming(0, { duration: 180 });
      imageOpacity.value = withTiming(0, { duration: 180 });
      openScale.value = withTiming(0.94, {
        duration: 200,
        easing: Easing.in(Easing.cubic),
      });
      // console.log("[IV] 5. withTiming animations STARTED", Date.now());
    }
  }, [visible]);

  // ─── Full-resolution crossfade ─────────────────────────────────────────
  // Fades in only once the full-res Image has actually decoded (onLoad),
  // not merely once the uri prop appears — avoids flashing an undecoded
  // frame. If imageUri disappears (viewer closed/reset), reset so the next
  // open starts from the thumbnail again.
  useEffect(() => {
    if (!imageUri) {
      imageOpacity.value = 0;
    }
  }, [imageUri]);

  const handleFullImageLoad = useCallback(() => {
    imageOpacity.value = withTiming(1, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, []);

  // Called via runOnJS from worklet gesture handlers — Haptics is a JS API,
  // not reanimated-worklet-safe, so it can't be called directly from there.
  const triggerZoomHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }, []);

  const triggerDismissHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }, []);

  // ─── Delayed "still loading" indicator ─────────────────────────────────
  // Most files decrypt fast enough that this never appears at all — it
  // only shows up if loadingFull is still true after SLOW_LOAD_THRESHOLD.
  useEffect(() => {
    if (!visible || !loadingFull || imageUri) {
      setShowSlowLoadIndicator(false);
      return;
    }
    const timer = setTimeout(
      () => setShowSlowLoadIndicator(true),
      SLOW_LOAD_THRESHOLD,
    );
    return () => clearTimeout(timer);
  }, [visible, loadingFull, imageUri]);

  // ─── Chrome timer ──────────────────────────────────────────────────────

  const clearChromeTimer = useCallback(() => {
    if (chromeTimer.current) {
      clearTimeout(chromeTimer.current);
      chromeTimer.current = null;
    }
  }, []);

  const scheduleChromeHide = useCallback(() => {
    clearChromeTimer();
    chromeTimer.current = setTimeout(() => {
      chromeOpacity.value = withTiming(0, { duration: 400 });
      runOnJS(setChromeVisible)(false);
    }, CHROME_HIDE_DELAY);
  }, []);

  const showChrome = useCallback(() => {
    chromeOpacity.value = withTiming(1, { duration: 200 });
    setChromeVisible(true);
    scheduleChromeHide();
  }, [scheduleChromeHide]);

  // ─── Pan bounds (clamped to image edges at current scale) ─────────────

  function getPanBounds(currentScale: number) {
    "worklet";
    const maxX = Math.max(0, (SCREEN.width * (currentScale - 1)) / 2);
    const maxY = Math.max(0, (SCREEN.height * (currentScale - 1)) / 2);
    return { maxX, maxY };
  }

  // ─── Pinch gesture ─────────────────────────────────────────────────────

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      cancelAnimation(translateX);
      cancelAnimation(translateY);
      savedScale.value = scale.value;
      runOnJS(showChrome)();
    })
    .onUpdate((e) => {
      scale.value = clamp(savedScale.value * e.scale, MIN_SCALE, MAX_SCALE);
    })
    .onEnd(() => {
      // Snap back if over-zoomed past limits
      if (scale.value < 1) {
        scale.value = withSpring(1, SPRING_CONFIG);
        translateX.value = withSpring(0, SPRING_CONFIG);
        translateY.value = withSpring(0, SPRING_CONFIG);
      } else if (scale.value > MAX_SCALE) {
        scale.value = withSpring(MAX_SCALE, SPRING_CONFIG);
      }

      // Re-clamp pan to new bounds
      const { maxX, maxY } = getPanBounds(scale.value);
      if (Math.abs(translateX.value) > maxX) {
        translateX.value = withSpring(
          clamp(translateX.value, -maxX, maxX),
          SPRING_SOFT,
        );
      }
      if (Math.abs(translateY.value) > maxY) {
        translateY.value = withSpring(
          clamp(translateY.value, -maxY, maxY),
          SPRING_SOFT,
        );
      }
      savedScale.value = scale.value;
    });

  // ─── Pan gesture ───────────────────────────────────────────────────────

  const panGesture = Gesture.Pan()
    .averageTouches(true)
    .onStart(() => {
      // console.log(
      //   "[IV] 8. PAN onStart - scale:",
      //   scale.value,
      //   "translateX:",
      //   translateX.value,
      //   "swipeY:",
      //   swipeY.value,
      // );

      cancelAnimation(translateX);
      cancelAnimation(translateY);
      savedX.value = translateX.value;
      savedY.value = translateY.value;
      isSwipingToClose.value = false;
      runOnJS(showChrome)();
    })
    .onUpdate((e) => {
      // If not zoomed in and dragging downward → swipe-to-close mode
      if (scale.value <= 1.05 && e.translationY > 0) {
        isSwipingToClose.value = true;
        swipeY.value = e.translationY;
        // Fade backdrop as they swipe down
        backdropOpacity.value = interpolate(
          e.translationY,
          [0, SCREEN.height * 0.5],
          [1, 0.2],
          Extrapolation.CLAMP,
        );
        return;
      }

      isSwipingToClose.value = false;
      swipeY.value = 0;

      // Normal pan (clamped to image bounds)
      const { maxX, maxY } = getPanBounds(scale.value);
      translateX.value = clamp(savedX.value + e.translationX, -maxX, maxX);
      translateY.value = clamp(savedY.value + e.translationY, -maxY, maxY);
    })
    .onEnd((e) => {
      // Check swipe-to-close thresholds
      if (
        isSwipingToClose.value &&
        (e.velocityY > SWIPE_CLOSE_VELOCITY ||
          swipeY.value > SWIPE_CLOSE_DISTANCE)
      ) {
        runOnJS(triggerDismissHaptic)();
        // // Animate off screen then call onClose
        // swipeY.value = withTiming(SCREEN.height, { duration: 280 });
        // backdropOpacity.value = withTiming(0, { duration: 240 }, () => {
        //   runOnJS(onClose)();
        // });

        // Animate off screen then call onClose.
        // Reset swipeY immediately so if visible becomes true again before
        // the animation completes, the reset is already committed.
        swipeY.value = withTiming(SCREEN.height, { duration: 280 }, () => {
          swipeY.value = 0;
        });
        backdropOpacity.value = withTiming(0, { duration: 240 }, () => {
          runOnJS(onClose)();
        });
        return;
      }

      // Swipe not strong enough — spring back
      if (isSwipingToClose.value) {
        swipeY.value = withSpring(0, SPRING_CONFIG);
        backdropOpacity.value = withSpring(1, SPRING_CONFIG);
        isSwipingToClose.value = false;
        return;
      }

      // Momentum for panned image
      const { maxX, maxY } = getPanBounds(scale.value);

      if (Math.abs(e.velocityX) > 100) {
        translateX.value = withDecay({
          velocity: e.velocityX,
          clamp: [-maxX, maxX],
          deceleration: 0.994,
        });
      }
      if (Math.abs(e.velocityY) > 100) {
        translateY.value = withDecay({
          velocity: e.velocityY,
          clamp: [-maxY, maxY],
          deceleration: 0.994,
        });
      }

      savedX.value = translateX.value;
      savedY.value = translateY.value;
    });

  // ─── Tap gesture (single = toggle chrome, double = zoom) ──────────────

  const tapGesture = Gesture.Tap()
    .maxDuration(250)
    .onStart((e) => {
      const now = Date.now();
      const timeSinceLast = now - lastTapTime.value;

      if (timeSinceLast < 280) {
        // Double tap — zoom toggle at tap location
        runOnJS(triggerZoomHaptic)();
        if (scale.value > 1.5) {
          // Zoom out
          scale.value = withSpring(1, SPRING_CONFIG);
          translateX.value = withSpring(0, SPRING_CONFIG);
          translateY.value = withSpring(0, SPRING_CONFIG);
          savedScale.value = 1;
          savedX.value = 0;
          savedY.value = 0;
        } else {
          // Zoom in centered on tap point
          const newScale = DOUBLE_TAP_ZOOM;
          const originX = (e.x - SCREEN.width / 2) * (1 - newScale);
          const originY = (e.y - SCREEN.height / 2) * (1 - newScale);
          const { maxX, maxY } = getPanBounds(newScale);

          scale.value = withSpring(newScale, SPRING_CONFIG);
          translateX.value = withSpring(
            clamp(originX, -maxX, maxX),
            SPRING_CONFIG,
          );
          translateY.value = withSpring(
            clamp(originY, -maxY, maxY),
            SPRING_CONFIG,
          );
          savedScale.value = newScale;
        }
      } else {
        // Single tap — toggle chrome
        runOnJS(showChrome)();
      }

      lastTapTime.value = now;
      lastTapX.value = e.x;
      lastTapY.value = e.y;
    });

  // ─── Compose gestures ─────────────────────────────────────────────────

  const composed = Gesture.Simultaneous(
    pinchGesture,
    Gesture.Race(panGesture, tapGesture),
  );

  // ─── Animated styles ──────────────────────────────────────────────────

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  // Swipe-to-close drag follow only — each image layer fades independently
  // (thumbStyle / fullImageStyle below) rather than sharing one opacity.
  const imageContainerStyle = useAnimatedStyle(() => {
    // Interactive drag-shrink — the image shrinks slightly the further
    // it's dragged toward dismissal, on top of the open/close pop-scale.
    // Composes multiplicatively so both effects read naturally together.
    const dragShrink = interpolate(
      swipeY.value,
      [0, SCREEN.height * 0.5],
      [1, 0.88],
      Extrapolation.CLAMP,
    );
    return {
      transform: [
        { translateY: swipeY.value },
        { scale: openScale.value * dragShrink },
      ],
    };
  });

  const imageTransformStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    opacity: thumbOpacity.value,
  }));

  const fullImageStyle = useAnimatedStyle(() => ({
    opacity: imageOpacity.value,
  }));

  const chromeStyle = useAnimatedStyle(() => ({
    opacity: chromeOpacity.value,
    pointerEvents: chromeOpacity.value > 0.1 ? "auto" : "none",
  }));

  // ─── Render───────────────────────────────────────────────────────────
  if (!visible) return null;
  return (
    <>
      {visible && (
        <View style={styles.overlay}>
          <StatusBar hidden translucent />
          <GestureHandlerRootView style={styles.root}>
            {/* Backdrop */}
            <Animated.View
              style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}
            />

            {/* Gesture layer */}
            <GestureDetector gesture={composed}>
              <Animated.View
                style={[StyleSheet.absoluteFill, imageContainerStyle]}
              >
                {/* Thumbnail — already cached, appears immediately so the
                    viewer never opens to a blank screen. */}
                {thumbUri && (
                  <Animated.Image
                    source={{ uri: thumbUri }}
                    style={[styles.image, imageTransformStyle, thumbStyle]}
                    resizeMode="contain"
                  />
                )}
                {/* Full-resolution image — crossfades in on top once it has
                    actually finished decoding (see handleFullImageLoad). */}
                {imageUri && (
                  <Animated.Image
                    source={{ uri: imageUri }}
                    style={[
                      StyleSheet.absoluteFill,
                      styles.image,
                      imageTransformStyle,
                      fullImageStyle,
                    ]}
                    resizeMode="contain"
                    onLoad={handleFullImageLoad}
                  />
                )}
              </Animated.View>
            </GestureDetector>

            {/* Subtle "still loading" indicator — only appears if the
                full-resolution decrypt is taking noticeably long. */}
            {showSlowLoadIndicator && (
              <Animated.View
                style={styles.slowLoadIndicator}
                pointerEvents="none"
              >
                <ActivityIndicator color="rgba(255,255,255,0.7)" />
              </Animated.View>
            )}

            {/* Chrome — top bar, bottom metadata bar, auto-hides */}
            <Animated.View
              style={[StyleSheet.absoluteFill, styles.chromeLayer, chromeStyle]}
              pointerEvents="box-none"
            >
              {/* Dismisses the more-menu on any outside tap. Only mounted
                  while the menu is open, so it never intercepts normal
                  image taps/gestures otherwise. */}
              {moreMenuVisible && (
                <Pressable
                  style={StyleSheet.absoluteFill}
                  onPress={() => setMoreMenuVisible(false)}
                />
              )}

              {/* Top bar — back / favorite / more */}
              <View style={styles.topBarWrap}>
                <BlurView
                  intensity={40}
                  tint="dark"
                  experimentalBlurMethod="dimezisBlurView"
                  style={styles.topBar}
                >
                  <ChromeButton
                    onPress={onClose}
                    style={styles.iconBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityLabel="Back"
                  >
                    <Text style={styles.iconBtnText}>‹</Text>
                  </ChromeButton>
                  <View style={styles.topBarSpacer} />
                  {file && (
                    <ChromeButton
                      onPress={() => onToggleFavorite(file)}
                      style={styles.iconBtn}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      accessibilityLabel={
                        file.isFavorite
                          ? "Remove from favorites"
                          : "Add to favorites"
                      }
                    >
                      <FavoriteGlyph active={file.isFavorite} />
                    </ChromeButton>
                  )}
                  <ChromeButton
                    onPress={() => setMoreMenuVisible((v) => !v)}
                    style={styles.iconBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityLabel="More options"
                  >
                    <Text style={styles.iconBtnText}>⋯</Text>
                  </ChromeButton>
                </BlurView>

                {moreMenuVisible && file && (
                  <Animated.View
                    entering={FadeIn.duration(120)}
                    exiting={FadeOut.duration(100)}
                    style={styles.moreMenu}
                  >
                    <BlurView
                      intensity={55}
                      tint="dark"
                      experimentalBlurMethod="dimezisBlurView"
                      style={styles.moreMenuBlur}
                    >
                      <ChromeButton
                        style={styles.moreMenuItem}
                        accessibilityLabel="Move to Album"
                        onPress={() => {
                          setMoreMenuVisible(false);
                          onOpenMoveSheet(file);
                        }}
                      >
                        <Text style={styles.moreMenuItemText}>
                          Move to Album
                        </Text>
                      </ChromeButton>
                      <View style={styles.moreMenuDivider} />
                      <ChromeButton
                        style={styles.moreMenuItem}
                        accessibilityLabel="Add Tags"
                        onPress={() => {
                          setMoreMenuVisible(false);
                          onOpenTagSheet(file);
                        }}
                      >
                        <Text style={styles.moreMenuItemText}>Add Tags</Text>
                      </ChromeButton>
                      <View style={styles.moreMenuDivider} />
                      <ChromeButton
                        style={styles.moreMenuItem}
                        accessibilityLabel="Export to Gallery"
                        onPress={() => {
                          setMoreMenuVisible(false);
                          onExportToGallery(file);
                        }}
                      >
                        <Text style={styles.moreMenuItemText}>
                          Export to Gallery
                        </Text>
                      </ChromeButton>
                      <View style={styles.moreMenuDivider} />
                      <ChromeButton
                        style={styles.moreMenuItem}
                        accessibilityLabel="Delete"
                        haptic={Haptics.ImpactFeedbackStyle.Medium}
                        onPress={() => {
                          setMoreMenuVisible(false);
                          onDelete(file);
                        }}
                      >
                        <Text
                          style={[
                            styles.moreMenuItemText,
                            styles.moreMenuItemDestructive,
                          ]}
                        >
                          Delete
                        </Text>
                      </ChromeButton>
                    </BlurView>
                  </Animated.View>
                )}
              </View>

              {/* Bottom bar — filename, date, size, album, tags */}
              {file && (
                <View style={styles.bottomBarWrap} pointerEvents="none">
                  <BlurView
                    intensity={40}
                    tint="dark"
                    experimentalBlurMethod="dimezisBlurView"
                    style={styles.bottomBar}
                  >
                    <Text style={styles.bottomFileName} numberOfLines={1}>
                      {file.displayName ?? file.name.replace(".vault", "")}
                    </Text>
                    <Text style={styles.bottomMeta} numberOfLines={1}>
                      {formatFullDate(file.createdAt * 1000)}
                      {"  ·  "}
                      {formatFileSize(file.size)}
                      {file.album ? `  ·  ${file.album}` : ""}
                    </Text>
                    {file.tags.length > 0 && (
                      <View style={styles.bottomTagRow}>
                        {file.tags.slice(0, 4).map((tag) => (
                          <View key={tag} style={styles.bottomTagChip}>
                            <Text
                              style={styles.bottomTagChipText}
                              numberOfLines={1}
                            >
                              #{tag}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </BlurView>
                </View>
              )}
            </Animated.View>
          </GestureHandlerRootView>
        </View>
      )}
    </>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // root: {
  //   flex: 1,
  //   backgroundColor: "transparent",
  // } as ViewStyle,
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    elevation: 9999,
  } as ViewStyle,

  root: {
    flex: 1,
    backgroundColor: "#000",
  } as ViewStyle,

  backdrop: {
    backgroundColor: "#000",
  } as ViewStyle,

  image: {
    width: SCREEN.width,
    height: SCREEN.height,
  } as ViewStyle,

  slowLoadIndicator: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    alignItems: "center",
    marginTop: -12,
  } as ViewStyle,

  chromeLayer: {
    justifyContent: "space-between",
  } as ViewStyle,

  // Top bar — real frosted glass (BlurView), back / favorite / more
  topBarWrap: {
    paddingTop: Platform.OS === "ios" ? 56 : 40,
    paddingHorizontal: 16,
  } as ViewStyle,

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 8,
    gap: 4,
    // Safety-net tint under the blur — some Android devices render a
    // weaker native blur, so this keeps the frosted-dark look consistent.
    backgroundColor: "rgba(10,10,10,0.35)",
  } as ViewStyle,

  topBarSpacer: { flex: 1 } as ViewStyle,

  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,

  iconBtnText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 20,
    fontWeight: "600",
  } as TextStyle,

  iconBtnTextActive: {
    color: "#fff",
  } as TextStyle,

  // More menu — small frosted popover under the top bar
  moreMenu: {
    position: "absolute",
    top: Platform.OS === "ios" ? 104 : 88,
    right: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    overflow: "hidden",
    minWidth: 168,
  } as ViewStyle,

  moreMenuBlur: {
    paddingVertical: 4,
    backgroundColor: "rgba(10,10,10,0.5)",
  } as ViewStyle,

  moreMenuItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  } as ViewStyle,

  moreMenuItemText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    fontWeight: "500",
  } as TextStyle,

  moreMenuItemDestructive: {
    color: "rgba(255,120,120,0.9)",
  } as TextStyle,

  moreMenuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.10)",
    marginHorizontal: 12,
  } as ViewStyle,

  // Bottom bar — real frosted glass, filename + metadata + tags
  bottomBarWrap: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  } as ViewStyle,

  bottomBar: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    overflow: "hidden",
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 4,
    backgroundColor: "rgba(10,10,10,0.35)",
  } as ViewStyle,

  bottomFileName: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.1,
  } as TextStyle,

  bottomMeta: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 12,
    letterSpacing: 0.1,
  } as TextStyle,

  bottomTagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  } as ViewStyle,

  bottomTagChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    maxWidth: 120,
  } as ViewStyle,

  bottomTagChipText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
  } as TextStyle,
});
