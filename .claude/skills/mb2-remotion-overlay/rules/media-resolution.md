---
name: media-resolution
description: MediaDB image_key resolution and asset management in MB2 Remotion
metadata:
  tags: media, image, asset, image_key, mediadb, resolution
---

## MediaDB

La MediaDB est un dictionnaire `image_key → chemin/URL` :

```typescript
type MediaDB = Record<string, string>;

const mediaDB: MediaDB = {
  "champions_darius": "/assets/champions/darius.png",
  "champions_ahri": "https://cdn.example.com/ahri.png",
  "items_trinity_force": "/assets/items/trinity_force.png",
  "runes_conqueror": "/assets/runes/conqueror.png",
};
```

## Résolution dans le pipeline

Quand le CSV/JSON contient une `image_key`, elle est résolue via la MediaDB :

```typescript
// Dans csv-parser.ts
if (imageKey && mediaDB && mediaDB[imageKey]) {
  entry.images.push({
    key: imageKey,
    resolvedUrl: mediaDB[imageKey],
  });
}
```

## Utilisation dans les composants

```tsx
import {Img} from 'remotion';

const image = entry.images[0];
const src = image?.resolvedUrl || image?.path || '';

{src && (
  <Img src={src} className="w-full h-full object-cover" />
)}
```

## Convention de nommage des clés

Les clés MediaDB suivent le format du plugin AE : `catégorie_nom` en snake_case.

| Catégorie | Exemples |
|-----------|----------|
| Champions | `champions_darius`, `champions_ahri` |
| Items | `items_trinity_force`, `items_dorans_blade` |
| Runes | `runes_conqueror`, `runes_lethal_tempo` |
| Spells | `spells_flash`, `spells_teleport` |
| Objectifs | `objectives_dragon`, `objectives_baron` |

## Assets locaux vs URLs

- En **preview** (`npm run preview`) : utiliser des chemins relatifs dans `/public/`
- En **rendu** (`npm run build`) : les URLs absolues ou chemins locaux fonctionnent
- TOUJOURS utiliser `<Img>` de Remotion, jamais `<img>` HTML natif

## Règles

- Une `image_key` absente de la MediaDB produit une image vide (pas d'erreur)
- Le composant DOIT gérer gracieusement l'absence d'image (ne rien afficher ou placeholder)
- La MediaDB du plugin AE et de Remotion utilisent le même format
- JAMAIS inventer une `image_key` — utiliser uniquement celles présentes dans la MediaDB
