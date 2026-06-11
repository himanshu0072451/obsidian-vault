/**
 * ImageViewer — immersive fullscreen image viewer
 *
 * Features:
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
  Modal,
  View,
  StyleSheet,
  Dimensions,
  StatusBar,
  Text,
  Pressable,
  Platform,
  ViewStyle,
  TextStyle,
} from "react-native";
import Animated, {
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImageViewerProps {
  visible: boolean;
  imageUri: string | null;
  fileName?: string | null;
  onClose: () => void;
}

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

// ─── ImageViewer ─────────────────────────────────────────────────────────────

export default memo(function ImageViewer({
  visible,
  imageUri,
  fileName,
  onClose,
}: ImageViewerProps) {
  // Visibility fade
  // const backdropOpacity = useSharedValue(0);
  const backdropOpacity = useSharedValue(1);
  const imageOpacity = useSharedValue(0);

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

  // Chrome (header/hint) visibility
  const chromeOpacity = useSharedValue(1);
  const [chromeVisible, setChromeVisible] = useState(true);
  const chromeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Double-tap tracking
  const lastTapTime = useSharedValue(0);
  const lastTapX = useSharedValue(0);
  const lastTapY = useSharedValue(0);

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

      // Reset all transform state
      scale.value = 1;
      savedScale.value = 1;
      translateX.value = 0;
      translateY.value = 0;
      savedX.value = 0;
      savedY.value = 0;
      swipeY.value = 0;
      isSwipingToClose.value = false;

      // // Fade in
      // backdropOpacity.value = withTiming(1, {
      //   duration: 220,
      //   easing: Easing.out(Easing.cubic),
      // });
      // imageOpacity.value = withTiming(1, {
      //   duration: 280,
      //   easing: Easing.out(Easing.cubic),
      // });

      // Backdrop is already solid (starts at 1); only image fades in
      imageOpacity.value = withTiming(1, {
        duration: 280,
        easing: Easing.out(Easing.cubic),
      });

      // Start chrome hide timer
      scheduleChromeHide();
    } else {
      clearChromeTimer();
      chromeOpacity.value = withTiming(0, { duration: 150 });
      backdropOpacity.value = withTiming(0, { duration: 200 });
      imageOpacity.value = withTiming(0, { duration: 180 });
      // console.log("[IV] 5. withTiming animations STARTED", Date.now());
    }
  }, [visible]);

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

  const imageContainerStyle = useAnimatedStyle(() => ({
    opacity: imageOpacity.value,
    transform: [{ translateY: swipeY.value }],
  }));

  const imageTransformStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const chromeStyle = useAnimatedStyle(() => ({
    opacity: chromeOpacity.value,
    pointerEvents: chromeOpacity.value > 0.1 ? "auto" : "none",
  }));

  // ─── Render───────────────────────────────────────────────────────────

  // if (!visible && imageOpacity.value === 0) return null;
  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar hidden translucent />

      <GestureHandlerRootView style={styles.root}>
        {/* Backdrop */}
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}
        />

        {/* Gesture layer */}
        <GestureDetector gesture={composed}>
          <Animated.View style={[StyleSheet.absoluteFill, imageContainerStyle]}>
            {imageUri && (
              <Animated.Image
                source={{ uri: imageUri }}
                style={[styles.image, imageTransformStyle]}
                resizeMode="contain"
                // onLoadStart={() =>
                //   console.log("[IV] 6. Image onLoadStart", Date.now())
                // }
                // onLoad={() =>
                //   console.log(
                //     "[IV] 7. Image onLoad (decode complete)",
                //     Date.now(),
                //   )
                // }
              />
            )}
          </Animated.View>
        </GestureDetector>

        {/* Chrome — header + hint, auto-hides */}
        <Animated.View
          style={[StyleSheet.absoluteFill, styles.chromeLayer, chromeStyle]}
          pointerEvents="box-none"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerGlass}>
              <View style={styles.lockDot} />
              <Text style={styles.fileName} numberOfLines={1}>
                {fileName ?? "Protected Image"}
              </Text>
              <Pressable
                onPress={onClose}
                style={styles.closeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel="Close image viewer"
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            </View>
          </View>

          {/* Bottom hint */}
          <View style={styles.hintRow} pointerEvents="none">
            <View style={styles.hintPill}>
              <Text style={styles.hintText}>
                Pinch · Double-tap · Swipe down to close
              </Text>
            </View>
          </View>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // root: {
  //   flex: 1,
  //   backgroundColor: "transparent",
  // } as ViewStyle,

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

  chromeLayer: {
    justifyContent: "space-between",
    paddingBottom: 48,
  } as ViewStyle,

  // Header — glassmorphic monochrome pill
  header: {
    paddingTop: Platform.OS === "ios" ? 56 : 40,
    paddingHorizontal: 16,
  } as ViewStyle,

  headerGlass: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(12,12,12,0.72)",
    // Subtle inner highlight on top edge
    shadowColor: "#fff",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 0,
    gap: 10,
  } as ViewStyle,

  lockDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "rgba(255,255,255,0.35)",
    flexShrink: 0,
  } as ViewStyle,

  fileName: {
    flex: 1,
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.2,
  } as TextStyle,

  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  } as ViewStyle,

  closeBtnText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 14,
  } as TextStyle,

  // Bottom hint
  hintRow: {
    alignItems: "center",
  } as ViewStyle,

  hintPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  } as ViewStyle,

  hintText: {
    color: "rgba(255,255,255,0.35)",
    fontSize: 11,
    letterSpacing: 0.3,
    fontWeight: "500",
  } as TextStyle,
});
