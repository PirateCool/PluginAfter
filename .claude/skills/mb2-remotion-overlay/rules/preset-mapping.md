---
name: preset-mapping
description: Mapping between AE presets and Remotion React components
metadata:
  tags: preset, mapping, component, overlay-root
---

## COMPONENT_MAP

Le mapping est défini dans `OverlayRoot.tsx`. Chaque preset AE est associé à un composant React :

```tsx
const COMPONENT_MAP: Record<string, React.FC<{entry: TimelineEntry; fps: number}>> = {
  'Titre':             Titre,
  'Texte':             Texte,
  'Titre + Texte':     TitrePlusTexte,
  'Bulletpoint':       Bulletpoint,
  'Bulletpoint 3':     Bulletpoint,
  'Bulletpoint 5':     Bulletpoint,
  'Bulletpoint 9':     Bulletpoint,
  'Pop up':            PopUp,
  'Pop icons':         PopIcons,
  'Champion focus':    ChampionFocus,
  'Item focus':        ChampionFocus,
  'Spell / Rune':      ChampionFocus,
  'Objectif':          ChampionFocus,
  'Conclusion':        Conclusion,
  'Erreur à éviter':   TitrePlusTexte,
  'Astuce coach':      TitrePlusTexte,
  'Checklist':         Bulletpoint,
};
```

## Fallback

Si un preset n'est pas dans le map, `Texte` est utilisé par défaut :

```tsx
const Component = COMPONENT_MAP[entry.presetName] || Texte;
```

## Familles

| Famille | Presets | Composants | Données principales |
|---------|---------|------------|---------------------|
| `text` | Titre, Texte, Titre + Texte, Bulletpoint*, Conclusion, Erreur, Astuce, Checklist | Titre, Texte, TitrePlusTexte, Bulletpoint, Conclusion | `texts[]`, `bullets[]` |
| `visual` | Pop up, Pop icons, Champion focus, Item focus, Spell / Rune, Objectif | PopUp, PopIcons, ChampionFocus | `images[]`, `texts[]` (pour le contexte) |

## Réutilisation de composants

Plusieurs presets partagent le même composant :
- **ChampionFocus** → Champion focus, Item focus, Spell / Rune, Objectif (même layout image + texte)
- **TitrePlusTexte** → Titre + Texte, Erreur à éviter, Astuce coach (même layout titre + sous-texte)
- **Bulletpoint** → Bulletpoint, Bulletpoint 3/5/9, Checklist (même révélation progressive)

## Ajouter un nouveau preset

1. Créer le composant dans `src/components/`
2. L'ajouter au `COMPONENT_MAP` dans `OverlayRoot.tsx`
3. Ajouter le preset correspondant dans le plugin AE si besoin
4. Le CSV/JSON peut référencer le nouveau preset par son nom
