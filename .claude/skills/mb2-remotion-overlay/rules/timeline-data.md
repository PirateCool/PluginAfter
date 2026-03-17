---
name: timeline-data
description: TimelineData schema and data flow for Marker Builder 2 Remotion
metadata:
  tags: timeline, schema, types, data, entry, preset
---

## TimelineData — structure principale

```typescript
interface TimelineData {
  fps: number;              // 25 par défaut (coaching LoL)
  width: number;            // 1920
  height: number;           // 1080
  durationInSeconds: number;
  entries: TimelineEntry[];
  mediaDB?: MediaDB;        // résolution image_key → URL
}
```

La composition Remotion est configurée à partir de ce schéma :

```tsx
<Composition
  id="OverlayComposition"
  component={OverlayRoot}
  durationInFrames={Math.round(timeline.durationInSeconds * timeline.fps)}
  fps={timeline.fps}
  width={timeline.width}
  height={timeline.height}
  defaultProps={{timeline}}
/>
```

## TimelineEntry — un overlay

```typescript
interface TimelineEntry {
  id: string;                    // identifiant unique
  presetName: string;            // nom du preset AE (ex: "Titre + Texte")
  presetId: string;
  startTime: number;             // secondes
  duration: number;              // secondes
  texts: string[];               // texts[0] = titre, texts[1] = sous-texte, etc.
  bullets: BulletEntry[];        // points bullet avec timing
  images: ImageEntry[];          // images avec résolution MediaDB
  family: 'text' | 'visual';
  position?: {x: number; y: number};
  animation?: {fade: number; moveX: number; moveY: number; blur: number};
}
```

## Règles de mapping

- `presetName` détermine le composant React via `COMPONENT_MAP`
- `texts[]` est indexé par slot : `texts[0]` = premier champ texte du template
- `bullets[]` est utilisé uniquement par les composants Bulletpoint
- `images[]` est utilisé par les composants visuels (PopUp, ChampionFocus, etc.)
- `animation` est optionnel, valeurs par défaut : `{fade: 0.35, moveX: 0, moveY: -100, blur: 50}`

## Flux de données

```
CSV/JSON ──→ csvToTimeline() ──→ TimelineData ──→ OverlayRoot ──→ Composants
              ou jsonToTimeline()
```

## Créer un TimelineData programmatiquement

```typescript
const timeline: TimelineData = {
  fps: 25,
  width: 1920,
  height: 1080,
  durationInSeconds: 120,
  entries: [
    {
      id: 'overlay-1',
      presetName: 'Titre',
      presetId: 'titre-1',
      startTime: 5.0,
      duration: 6.0,
      texts: ['Mon titre ici'],
      bullets: [],
      images: [],
      family: 'text',
    }
  ],
};
```
