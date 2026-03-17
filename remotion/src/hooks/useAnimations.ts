import {useCurrentFrame, useVideoConfig, interpolate, Easing} from 'remotion';

/**
 * Fade-out animation that starts at (duration - fade) seconds.
 * Mirrors the AE expression:
 *   var f = Math.max(0.001, effect('MB2 Fade (s)')(1));
 *   var t0 = outPoint - f;
 *   (time <= t0) ? 100 : ease(time, t0, outPoint, 100, 0);
 *
 * Returns opacity in 0..1 range.
 */
export function useFadeOut(params: {
  startFrame: number;
  durationFrames: number;
  fadeDurationSeconds: number;
}): number {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const {startFrame, durationFrames, fadeDurationSeconds} = params;
  const fadeSec = Math.max(0.001, fadeDurationSeconds);
  const fadeFrames = Math.round(fadeSec * fps);

  // The frame within the overlay's local timeline
  const localFrame = frame - startFrame;

  // t0 = outPoint - fade, in local frames
  const fadeStartFrame = durationFrames - fadeFrames;

  if (localFrame <= fadeStartFrame) {
    return 1;
  }

  // ease(time, t0, outPoint, 100, 0) mapped to 0..1
  return interpolate(localFrame, [fadeStartFrame, durationFrames], [1, 0], {
    easing: Easing.inOut(Easing.ease),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

/**
 * Slide-out animation during fade period.
 * Mirrors AE expression:
 *   var f = Math.max(0.001, effect('MB2 Fade (s)')(1));
 *   var dx = effect('MB2 Move X')(1);
 *   var dy = effect('MB2 Move Y')(1);
 *   var t0 = outPoint - f;
 *   var p = clamp((time - t0) / f, 0, 1);
 *   value + [dx * p, dy * p];
 *
 * Returns the offset {x, y} to add to the element's position.
 */
export function useSlideOut(params: {
  startFrame: number;
  durationFrames: number;
  fadeDurationSeconds: number;
  moveX: number;
  moveY: number;
}): {x: number; y: number} {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const {startFrame, durationFrames, fadeDurationSeconds, moveX, moveY} =
    params;
  const fadeSec = Math.max(0.001, fadeDurationSeconds);
  const fadeFrames = Math.round(fadeSec * fps);

  const localFrame = frame - startFrame;
  const fadeStartFrame = durationFrames - fadeFrames;

  // p = clamp((time - t0) / f, 0, 1) -- linear progress, matching AE
  const p = interpolate(localFrame, [fadeStartFrame, durationFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return {
    x: moveX * p,
    y: moveY * p,
  };
}

/**
 * Blur-out animation during fade period.
 * Mirrors AE expression:
 *   var f = Math.max(0.001, effect('MB2 Fade (s)')(1));
 *   var b = effect('MB2 Blur')(1);
 *   var t0 = outPoint - f;
 *   (time <= t0) ? 0 : ease(time, t0, outPoint, 0, b);
 *
 * Returns blur value in px.
 */
export function useBlurOut(params: {
  startFrame: number;
  durationFrames: number;
  fadeDurationSeconds: number;
  blurMax: number;
}): number {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const {startFrame, durationFrames, fadeDurationSeconds, blurMax} = params;
  const fadeSec = Math.max(0.001, fadeDurationSeconds);
  const fadeFrames = Math.round(fadeSec * fps);

  const localFrame = frame - startFrame;
  const fadeStartFrame = durationFrames - fadeFrames;

  if (localFrame <= fadeStartFrame) {
    return 0;
  }

  return interpolate(localFrame, [fadeStartFrame, durationFrames], [0, blurMax], {
    easing: Easing.inOut(Easing.ease),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

/**
 * Combined outro animation state.
 * Wraps useFadeOut, useSlideOut, and useBlurOut into a single call
 * matching the full applyOutroExpressions behaviour from the AE plugin.
 */
export function useOutroAnimation(params: {
  startFrame: number;
  durationFrames: number;
  fade: number;
  moveX: number;
  moveY: number;
  blur: number;
}): {
  opacity: number;
  translateX: number;
  translateY: number;
  blur: number;
} {
  const {startFrame, durationFrames, fade, moveX, moveY, blur} = params;

  const needsFade = fade > 0;
  const needsMove =
    needsFade && (Math.abs(moveX) > 0.001 || Math.abs(moveY) > 0.001);
  const needsBlur = needsFade && blur > 0.001;

  const opacity = needsFade
    ? useFadeOut({startFrame, durationFrames, fadeDurationSeconds: fade})
    : 1;

  const slide = needsMove
    ? useSlideOut({
        startFrame,
        durationFrames,
        fadeDurationSeconds: fade,
        moveX,
        moveY,
      })
    : {x: 0, y: 0};

  const blurValue = needsBlur
    ? useBlurOut({
        startFrame,
        durationFrames,
        fadeDurationSeconds: fade,
        blurMax: blur,
      })
    : 0;

  return {
    opacity,
    translateX: slide.x,
    translateY: slide.y,
    blur: blurValue,
  };
}

/**
 * Bullet reveal animation - progressive appearance with slide and blur.
 * Mirrors applyBulletRevealAnimation from the AE plugin (csv-import.js):
 *
 *   Opacity:  keyframe 0 at tIn  -> 100 at tIn + animDur
 *   Position: start[0] = base[0] + offsetX at tIn -> base[0] at tIn + animDur
 *   Blur:     blurStart at tIn -> 0 at tIn + animDur
 *
 * The AE version uses linear keyframe interpolation between the two keyframes,
 * so we use linear easing here to match.
 */
export function useBulletReveal(params: {
  /** Frame offset within the overlay when this bullet appears */
  revealFrame: number;
  /** Animation duration in frames */
  animDurationFrames: number;
  /** Horizontal slide distance in px (default: -30, matching AE default) */
  slideX?: number;
  /** Starting blur value (default: 70, matching AE default) */
  blurStart?: number;
}): {
  opacity: number;
  translateX: number;
  blur: number;
} {
  const frame = useCurrentFrame();

  const {revealFrame, animDurationFrames} = params;
  const slideX = params.slideX ?? -30;
  const blurStart = params.blurStart ?? 70;

  const animDur = Math.max(1, animDurationFrames);
  const animEnd = revealFrame + animDur;

  // Opacity: 0 at revealFrame -> 1 at revealFrame + animDur
  const opacity = interpolate(frame, [revealFrame, animEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Position X offset: slideX at revealFrame -> 0 at revealFrame + animDur
  const translateX = interpolate(frame, [revealFrame, animEnd], [slideX, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Blur: blurStart at revealFrame -> 0 at revealFrame + animDur
  const blur = interpolate(
    frame,
    [revealFrame, animEnd],
    [Math.max(0, blurStart), 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    },
  );

  return {opacity, translateX, blur};
}
