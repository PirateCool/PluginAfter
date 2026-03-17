---
name: lol-theme
description: LoL coaching visual theme for Marker Builder 2 overlays
metadata:
  tags: theme, lol, colors, typography, design, gold, dark
---

## Palette de couleurs

| Rôle | Valeur | Usage |
|------|--------|-------|
| Or / accent principal | `#C89B3C` | Bordures, titres focus, séparateurs, icônes bullet |
| Fond overlay | `bg-gray-900/80` ou `bg-black/70` | Background semi-transparent des overlays |
| Texte principal | `text-white` | Corps de texte |
| Texte secondaire | `text-gray-300` | Sous-titres, descriptions |
| Texte accent | `text-[#C89B3C]` | Noms de champions, titres dans ChampionFocus |
| Bordure accent | `border-[#C89B3C]` | Bordure gauche des titres, cadre des images |
| Glow | `shadow-[0_0_20px_rgba(200,155,60,0.3)]` | Effet lueur sur Conclusion |

## Typographie

```tsx
// Titre principal
<h2 className="text-white text-xl font-bold">

// Sous-texte
<p className="text-gray-300 text-sm mt-1">

// Nom champion (accent or)
<h3 className="text-[#C89B3C] text-lg font-bold">

// Bullet point
<span className="text-white text-sm">
```

- Police système sans-serif (pas de Google Font pour le moment)
- Titres : `font-bold`, taille `text-xl` ou `text-2xl`
- Corps : `text-sm` ou `text-base`
- Pas d'italique sauf citation

## Spacing et layout

```tsx
// Overlay standard
<div className="bg-gray-900/80 rounded-lg px-6 py-4 max-w-md">

// Avec bordure gauche accent
<div className="... border-l-4 border-[#C89B3C]">

// Espacement entre éléments
<div className="space-y-2">  // vertical
<div className="space-x-3">  // horizontal (icons)
```

- `max-w-md` (448px) pour les overlays texte
- `max-w-sm` (384px) pour les popups/icons
- `rounded-lg` pour tous les containers
- `px-6 py-4` padding standard

## Images

```tsx
// Champion / Item image
<div className="w-20 h-20 rounded-md overflow-hidden border-2 border-[#C89B3C]">
  <Img src={url} className="w-full h-full object-cover" />
</div>

// Icon dans PopIcons
<div className="w-[72px] h-[72px] rounded-full overflow-hidden border-2 border-[#C89B3C]">
```

- TOUJOURS utiliser `<Img>` de Remotion, pas `<img>`
- `object-cover` pour les images recadrées
- Bordure or `border-2 border-[#C89B3C]` sur les images

## Marqueurs bullet

```tsx
// Diamant or avant chaque bullet
<span className="text-[#C89B3C] mr-2">◆</span>
```

## Règles

- TOUJOURS fond semi-transparent, jamais opaque (le gameplay doit rester visible)
- TOUJOURS utiliser `#C89B3C` pour les accents, pas d'autre couleur
- JAMAIS de couleurs vives/saturées sur le fond (pas de rouge, bleu vif, etc.)
- Les overlays se positionnent côté droit de l'écran (zone gameplay à gauche)
- Le contraste texte/fond doit être suffisant sur une vidéo de gameplay sombre
