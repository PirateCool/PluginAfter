---
name: animation-porting
description: Porting After Effects expressions to Remotion hooks for Marker Builder 2
metadata:
  tags: animation, ae-expression, interpolate, fade, blur, slide, bullet-reveal
---

## Principe

Les expressions AE sont portées en hooks Remotion utilisant `useCurrentFrame()` + `interpolate()`.
JAMAIS de CSS transitions ni d'`animate-*` Tailwind.

## Correspondance expressions AE → Remotion

### Fade de sortie (opacity)

**AE :**
```javascript
var f = Math.max(0.001, effect('MB2 Fade (s)')(1));
var t0 = outPoint - f;
(time <= t0) ? 100 : ease(time, t0, outPoint, 100, 0);
```

**Remotion :**
```tsx
import {useCurrentFrame, interpolate, Easing} from 'remotion';

const frame = useCurrentFrame();
const fadeStartFrame = startFrame + durationFrames - Math.round(fadeDuration * fps);

const opacity = interpolate(
  frame,
  [fadeStartFrame, startFrame + durationFrames],
  [1, 0],
  {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.ease)}
);
```

### Slide de sortie (position)

**AE :**
```javascript
var p = clamp((time - t0) / f, 0, 1);
value + [dx * p, dy * p];
```

**Remotion :**
```tsx
const progress = interpolate(
  frame,
  [fadeStartFrame, startFrame + durationFrames],
  [0, 1],
  {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
);
const translateX = moveX * progress;
const translateY = moveY * progress;
```

Le slide AE est linéaire (pas easé), contrairement au fade.

### Blur de sortie

**AE :**
```javascript
(time <= t0) ? 0 : ease(time, t0, outPoint, 0, blurMax);
```

**Remotion :**
```tsx
const blur = interpolate(
  frame,
  [fadeStartFrame, startFrame + durationFrames],
  [0, blurMax],
  {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.ease)}
);

// Appliquer via style
style={{ filter: blur > 0.1 ? `blur(${blur}px)` : 'none' }}
```

### Bullet reveal

**AE :**
```javascript
// Keyframes à tIn et tIn + animDur :
// Opacity : 0 → 100
// Position : [baseX + offsetX, baseY] → [baseX, baseY]
// Blur : blurStart → 0
```

**Remotion :**
```tsx
const {opacity, translateX, blur} = useBulletReveal({
  revealFrame: Math.round(bullet.inOffset * fps),
  animDurationFrames: Math.round(0.333 * fps),
  slideX: -30,
  blurStart: 70,
});
```

## Hooks disponibles

| Hook | Usage |
|------|-------|
| `useFadeOut` | Opacity de sortie seule |
| `useSlideOut` | Déplacement X/Y pendant le fade |
| `useBlurOut` | Blur gaussien pendant le fade |
| `useOutroAnimation` | Combine fade + slide + blur (utilisé par OverlayWrapper) |
| `useBulletReveal` | Apparition progressive d'un bullet (opacity + slide + blur) |

## Règles

- TOUJOURS passer les durées en secondes, convertir en frames dans le hook
- Les valeurs AE (moveX, moveY, blur) sont en pixels, les garder telles quelles
- `fade` AE = durée en secondes de la transition de sortie
- L'easing AE `ease()` correspond à `Easing.inOut(Easing.ease)` en Remotion
- Le slide AE est linéaire, pas easé
