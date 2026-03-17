---
name: overlay-components
description: Creating and structuring overlay components for Marker Builder 2
metadata:
  tags: overlay, component, preset, titre, bulletpoint, popup, champion
---

## Component contract

Every overlay component MUST follow this interface:

```tsx
interface OverlayComponentProps {
  entry: TimelineEntry;
  fps: number;
}
```

Components receive their data from `entry.texts[]`, `entry.bullets[]`, and `entry.images[]`.

## Component structure

```tsx
import React from 'react';
import {TimelineEntry} from '../types';

export const MonOverlay: React.FC<{entry: TimelineEntry; fps: number}> = ({entry, fps}) => {
  const title = entry.texts[0] || '';

  return (
    <div className="bg-gray-900/80 rounded-lg px-6 py-4 max-w-md border-l-4 border-[#C89B3C]">
      <h2 className="text-white text-xl font-bold">{title}</h2>
    </div>
  );
};
```

## Rules

- ALWAYS use Tailwind classes for styling
- NEVER use CSS transitions or `animate-*` — use Remotion hooks only
- ALWAYS provide fallback values: `entry.texts[0] || ''`
- ALWAYS wrap in `<OverlayWrapper>` when placed in the timeline (done by `OverlayRoot`)
- Component names match preset names: `Titre`, `Texte`, `Bulletpoint`, `PopUp`, etc.

## Existing components

| Composant | Preset(s) AE | Slots texte | Slots image |
|-----------|-------------|-------------|-------------|
| `Titre` | Titre | 1 | 0 |
| `Texte` | Texte | 1 | 0 |
| `TitrePlusTexte` | Titre + Texte, Erreur à éviter, Astuce coach | 2 | 0 |
| `Bulletpoint` | Bulletpoint, Bulletpoint 3/5/9, Checklist | 1 titre + N bullets | 0 |
| `PopUp` | Pop up | 0 | 1 |
| `PopIcons` | Pop icons | 0 | N |
| `ChampionFocus` | Champion focus, Item focus, Spell / Rune, Objectif | 2 | 1 |
| `Conclusion` | Conclusion | 1 | 0 |

## Adding a new overlay

1. Create `src/components/MonNouvelOverlay.tsx`
2. Follow the `{entry, fps}` props contract
3. Register in `COMPONENT_MAP` in `OverlayRoot.tsx`:
```tsx
const COMPONENT_MAP = {
  // ...existing entries
  'Mon Nouvel Overlay': MonNouvelOverlay,
};
```
4. Add the corresponding preset in the AE plugin if needed

## OverlayWrapper

All components are wrapped by `<OverlayWrapper>` which handles:
- Positioning via `<Sequence from={} durationInFrames={}>`
- Outro animation (fade + slide + blur) via `useOutroAnimation`

```tsx
<OverlayWrapper key={entry.id} entry={entry} fps={fps}>
  <MonOverlay entry={entry} fps={fps} />
</OverlayWrapper>
```

Do NOT handle positioning or outro inside individual components.
