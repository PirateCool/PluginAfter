---
name: ae-remotion-bridge
description: Correspondence between After Effects and Remotion concepts for MB2
metadata:
  tags: ae, after-effects, remotion, porting, bridge, correspondence
---

## Table de correspondance

| Concept AE (ExtendScript) | Équivalent Remotion (React) |
|---------------------------|----------------------------|
| Composition | `<Composition>` |
| Layer (calque) | Composant React |
| Layer inPoint / outPoint | `<Sequence from={} durationInFrames={}>` |
| Composition time | `useCurrentFrame() / fps` |
| Frame rate (comp.frameRate) | `useVideoConfig().fps` |
| Comp width/height | `useVideoConfig().width/height` |
| Expression opacity | `interpolate()` → `style={{opacity}}` |
| Expression position | `interpolate()` → `style={{transform}}` |
| Gaussian Blur effect | `style={{filter: 'blur(Xpx)'}}` |
| Keyframes | `interpolate(frame, [f1,f2], [v1,v2])` |
| ease() | `Easing.inOut(Easing.ease)` |
| Slider Control effect | Props du composant |
| Marqueur composition | `TimelineEntry` dans le JSON |
| Composition modèle (template) | Composant React (via COMPONENT_MAP) |
| `app.beginUndoGroup` | Pas d'équivalent (pas destructif) |
| `comp.layers.add()` | JSX dans le render |
| Precomp / nested comp | Composant enfant React |
| Source Text | `entry.texts[n]` |
| replaceSource (image) | `<Img src={entry.images[n].resolvedUrl}>` |
| DB presets (AE settings) | `TimelineData` JSON/CSV |
| MediaDB (AE settings) | `mediaDB` object passé au parser |
| Agent Pack (export) | Même format, importable par Remotion |
| CSV import wizard | `csvToTimeline()` direct |
| Stack anchor placement | CSS positioning (`position: absolute`) |

## Porting checklist

Quand tu portes une fonctionnalité AE vers Remotion :

1. **Données** : le preset AE correspond-il à un `TimelineEntry` ? Vérifier les champs.
2. **Visuel** : le template AE correspond-il à un composant React ? Vérifier le COMPONENT_MAP.
3. **Animation** : les expressions AE ont-elles un hook Remotion ? Vérifier `useAnimations.ts`.
4. **Positionnement** : le mode placement AE (stack_anchor) est géré par CSS dans OverlayWrapper.
5. **Injection** : le texte/image AE (replaceSource) correspond aux props entry.texts/images.

## Ce qui n'est PAS porté

- L'UI ScriptUI du plugin (remplacée par Remotion Studio)
- Le système de markers AE (remplacé par TimelineData)
- Les effets AE natifs (Gaussian Blur → CSS filter)
- Le système de dossiers projet AE
- L'undo/redo AE

## Différences de comportement

| Aspect | AE | Remotion |
|--------|----|---------|
| Rendu | GPU compositing | Chrome headless |
| Framerate | Variable, comp-based | Fixe, défini dans Composition |
| Texte | AE text engine | HTML/CSS |
| Images | Footage items | `<Img>` component |
| Blur | Effect stack | CSS `filter: blur()` |
| Positionnement | Anchor point + Transform | CSS absolute + transform |
