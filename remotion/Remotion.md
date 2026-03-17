# Marker Builder 2 -- Version Remotion

## 1. Introduction

Version Remotion de **Marker Builder 2**. Cette version permet de generer des videos avec overlays de coaching League of Legends directement dans le navigateur, sans After Effects.

La stack technique repose sur :

- **React 19** pour le rendu des composants overlay
- **TypeScript 5** pour le typage strict des donnees
- **Remotion 4** pour le moteur de rendu video (preview + export MP4)
- **Tailwind CSS 4** pour le styling rapide et coherent

Le meme pipeline de donnees (CSV, JSON) que le plugin After Effects est supporte : un fichier CSV produit pour AE fonctionne tel quel dans Remotion.

---

## 2. Installation et demarrage

```bash
cd remotion
npm install
```

### Commandes disponibles

| Commande | Description |
|---|---|
| `npm run preview` | Lance Remotion Studio dans le navigateur (preview interactive) |
| `npm run build` | Rendu MP4 de la composition `OverlayComposition` vers `out/video.mp4` |
| `npm run render` | Rendu personnalise via `remotion render` (passer les arguments manuellement) |

### Exemples

```bash
# Preview dans le navigateur
npm run preview

# Rendu MP4 par defaut (1920x1080, 25fps)
npm run build

# Rendu avec parametres personnalises
npx remotion render src/index.tsx OverlayComposition out/custom.mp4 --props='{"timeline": ...}'
```

---

## 3. Architecture

### Structure des dossiers

```
remotion/
  package.json              # Dependances et scripts npm
  src/
    index.tsx               # Point d'entree Remotion (registerRoot, Composition)
    types/
      index.ts              # Types TypeScript (TimelineData, Preset, etc.)
    hooks/
      useAnimations.ts      # Hooks d'animation (port des expressions AE)
    components/
      OverlayRoot.tsx       # Composant racine : dispatche les entries vers les composants
      OverlayWrapper.tsx    # Wrapper commun : Sequence + animations outro
      Titre.tsx             # Overlay titre simple
      Texte.tsx             # Overlay texte paragraphe
      TitrePlusTexte.tsx    # Overlay titre + sous-texte
      Bulletpoint.tsx       # Overlay liste a puces avec reveal progressif
      PopUp.tsx             # Overlay image popup
      PopIcons.tsx          # Overlay rangee d'icones
      ChampionFocus.tsx     # Overlay focus champion/item/spell (image + texte)
      Conclusion.tsx        # Overlay conclusion (texte centre, bordure doree)
    data/
      csv-parser.ts         # Parseur CSV et JSON -> TimelineData
      sample.ts             # Donnees d'exemple pour le preview
    styles/
      global.css            # Styles globaux + Tailwind
```

### Flux de donnees

```
CSV / JSON
    |
    v
csvToTimeline() / jsonToTimeline()       (data/csv-parser.ts)
    |
    v
TimelineData  { fps, width, height, entries[], mediaDB }
    |
    v
<Composition defaultProps={{ timeline }}>  (src/index.tsx)
    |
    v
<OverlayRoot timeline={...}>              (components/OverlayRoot.tsx)
    |
    v  (pour chaque entry)
COMPONENT_MAP[entry.presetName]           -> composant React correspondant
    |
    v
<OverlayWrapper>                          -> Sequence + outro animation
    |
    v
<Titre> / <Bulletpoint> / <ChampionFocus> / ...   -> rendu visuel
    |
    v
Remotion render -> MP4 / preview navigateur
```

Le composant `OverlayRoot` itere sur `entries` et resout chaque `presetName` vers le composant React correspondant via `COMPONENT_MAP`. Si aucun preset ne correspond, le composant `Texte` est utilise par defaut.

---

## 4. Schema de donnees

### `TimelineData` -- container principal

```typescript
interface TimelineData {
  fps: number;                    // FPS video (defaut: 25)
  width: number;                  // Largeur en px (defaut: 1920)
  height: number;                 // Hauteur en px (defaut: 1080)
  durationInSeconds: number;      // Duree totale en secondes
  entries: TimelineEntry[];       // Liste des overlays
  mediaDB?: MediaDB;             // Base de donnees images (cle -> URL)
}
```

### `TimelineEntry` -- un overlay individuel

```typescript
interface TimelineEntry {
  id: string;                     // Identifiant unique
  presetName: string;             // Nom du preset (ex: "Titre", "Bulletpoint")
  presetId: string;               // ID normalise du preset
  startTime: number;              // Debut en secondes
  duration: number;               // Duree en secondes
  texts: string[];                // Textes a injecter (indexe par slot)
  bullets: BulletEntry[];         // Points bullet avec timing optionnel
  images: ImageEntry[];           // Images avec resolution MediaDB
  position?: { x: number; y: number };  // Position override
  animation?: {                   // Overrides d'animation
    fade: number;                 // Duree du fade out en secondes
    moveX: number;                // Deplacement X pendant le fade (px)
    moveY: number;                // Deplacement Y pendant le fade (px)
    blur: number;                 // Blur max pendant le fade (px)
  };
  family: 'text' | 'visual';     // Famille du preset
}
```

### `BulletEntry` -- point bullet

```typescript
interface BulletEntry {
  text: string;                   // Texte du bullet
  inOffset?: number;              // Offset d'apparition depuis le debut de l'overlay (s)
  outOffset?: number;             // Offset de disparition (s)
}
```

Les offsets sont relatifs au debut de l'overlay parent. Si `inOffset` n'est pas fourni, un stagger automatique de 0.4s entre chaque bullet est applique.

### `ImageEntry` -- image avec resolution MediaDB

```typescript
interface ImageEntry {
  path?: string;                  // Chemin direct ou URL
  key?: string;                   // Cle dans MediaDB
  resolvedUrl?: string;           // URL resolue apres lookup MediaDB
}
```

### `Preset` -- definition complete d'un preset

```typescript
interface Preset {
  id: string;
  name: string;
  tags: string;
  description: string;
  favorite: boolean;
  modelComp: string;              // Nom de la composition modele AE
  dur: number;                    // Duree par defaut (s)
  fade: number;                   // Fade par defaut (s)
  moveX: number;                  // Deplacement X par defaut
  moveY: number;                  // Deplacement Y par defaut
  blur: number;                   // Blur par defaut
  spawnAnchor: SpawnAnchor;       // Point d'ancrage (9 positions)
  spawnOffsetX: number;
  spawnOffsetY: number;
  layoutMode: LayoutMode;         // 'stack_anchor' | 'manual' | 'fullscreen'
  family: PresetFamily;           // 'text' | 'visual'
  gridWUnits: number;
  gridHUnits: number;
  textSlots: number;              // Nombre de slots texte
  imageSlots: number;             // Nombre de slots image
  inject: boolean;
  markerLabel: number;
}
```

Le type `Preset` est herite directement du plugin AE. Il decrit la configuration complete d'un type d'overlay, y compris les valeurs par defaut d'animation et de positionnement.

### `MediaDB` -- base de donnees media

```typescript
interface MediaDB {
  [key: string]: string;          // cle -> URL ou chemin
}
```

Permet de resoudre les `image_key` du CSV vers des URLs concretes. Meme principe que dans le plugin AE.

---

## 5. Composants overlay

### Table de correspondance preset -> composant

| Preset AE | Composant React | Description |
|---|---|---|
| `Titre` | `<Titre>` | Titre court avec accent or a gauche. Un seul slot texte. |
| `Texte` | `<Texte>` | Paragraphe de texte libre. Un seul slot texte. |
| `Titre + Texte` | `<TitrePlusTexte>` | Titre + sous-texte. Deux slots texte (`texts[0]` = titre, `texts[1]` = corps). |
| `Bulletpoint` | `<Bulletpoint>` | Liste a puces avec reveal progressif. Titre + N bullets. |
| `Bulletpoint 3` | `<Bulletpoint>` | Variante 3 bullets (meme composant). |
| `Bulletpoint 5` | `<Bulletpoint>` | Variante 5 bullets (meme composant). |
| `Bulletpoint 9` | `<Bulletpoint>` | Variante 9 bullets (meme composant). |
| `Pop up` | `<PopUp>` | Image popup avec ombre portee et bordure doree. |
| `Pop icons` | `<PopIcons>` | Rangee d'icones (plusieurs images cote a cote). |
| `Champion focus` | `<ChampionFocus>` | Focus champion : image 80x80 + nom + contexte. |
| `Item focus` | `<ChampionFocus>` | Focus item (meme composant que Champion focus). |
| `Spell / Rune` | `<ChampionFocus>` | Focus spell/rune (meme composant que Champion focus). |
| `Objectif` | `<ChampionFocus>` | Focus objectif (meme composant que Champion focus). |
| `Conclusion` | `<Conclusion>` | Texte centre, bordure doree pleine, ombre lumineuse. |
| `Erreur a eviter` | `<TitrePlusTexte>` | Reutilise le composant Titre + Texte. |
| `Astuce coach` | `<TitrePlusTexte>` | Reutilise le composant Titre + Texte. |
| `Checklist` | `<Bulletpoint>` | Reutilise le composant Bulletpoint. |

### Composant commun : `OverlayWrapper`

Tous les composants sont encapsules dans `<OverlayWrapper>` qui gere :

1. **Le timing** via `<Sequence from={startFrame} durationInFrames={durationFrames}>` -- l'overlay n'est visible que pendant sa fenetre temporelle
2. **Le positionnement** via `position: absolute` avec `right` et `top` (defaut : 100px)
3. **L'animation de sortie** via `useOutroAnimation` -- opacity, translate, blur

---

## 6. Systeme d'animation

### Hooks disponibles

Les animations sont implementees comme des hooks React dans `src/hooks/useAnimations.ts`. Chaque hook est un port direct d'une expression After Effects.

#### `useFadeOut` -- fade de sortie

Port de l'expression AE :
```javascript
// AE expression (opacity)
var f = Math.max(0.001, effect('MB2 Fade (s)')(1));
var t0 = outPoint - f;
(time <= t0) ? 100 : ease(time, t0, outPoint, 100, 0);
```

Equivalent Remotion :
```typescript
const opacity = useFadeOut({
  startFrame: 0,
  durationFrames: 150,
  fadeDurationSeconds: 0.35,
});
// Retourne un nombre entre 0 et 1
```

L'opacite reste a 1 pendant toute la duree de l'overlay, puis descend progressivement a 0 pendant les dernieres `fadeDurationSeconds` secondes, avec un easing `Easing.inOut(Easing.ease)`.

#### `useSlideOut` -- slide de sortie

Port de l'expression AE :
```javascript
// AE expression (position)
var f = Math.max(0.001, effect('MB2 Fade (s)')(1));
var dx = effect('MB2 Move X')(1);
var dy = effect('MB2 Move Y')(1);
var t0 = outPoint - f;
var p = clamp((time - t0) / f, 0, 1);
value + [dx * p, dy * p];
```

Equivalent Remotion :
```typescript
const {x, y} = useSlideOut({
  startFrame: 0,
  durationFrames: 150,
  fadeDurationSeconds: 0.35,
  moveX: 0,
  moveY: -100,
});
// Retourne le decalage {x, y} a ajouter a la position
```

Le slide est lineaire (pas d'easing), ce qui correspond au comportement AE `clamp((time - t0) / f, 0, 1)`.

#### `useBlurOut` -- blur de sortie

Port de l'expression AE :
```javascript
// AE expression (blur)
var f = Math.max(0.001, effect('MB2 Fade (s)')(1));
var b = effect('MB2 Blur')(1);
var t0 = outPoint - f;
(time <= t0) ? 0 : ease(time, t0, outPoint, 0, b);
```

Le blur passe de 0 a `blurMax` pendant la periode de fade, avec easing `Easing.inOut(Easing.ease)`.

#### `useOutroAnimation` -- animation de sortie combinee

Combine `useFadeOut`, `useSlideOut` et `useBlurOut` en un seul appel. C'est le hook utilise par `OverlayWrapper` :

```typescript
const outro = useOutroAnimation({
  startFrame, durationFrames,
  fade: 0.35,
  moveX: 0,
  moveY: -100,
  blur: 50,
});
// outro.opacity, outro.translateX, outro.translateY, outro.blur
```

Optimisation : si `fade` vaut 0, aucun calcul n'est effectue (pas de hooks conditionnels -- les hooks sont toujours appeles mais retournent des valeurs neutres).

#### `useBulletReveal` -- revelation progressive des bullets

Port de `applyBulletRevealAnimation` du plugin AE (`csv-import.js`). Chaque bullet apparait individuellement avec :

- **Opacity** : 0 -> 1 (lineaire)
- **TranslateX** : -30px -> 0px (slide depuis la gauche, lineaire)
- **Blur** : 70px -> 0px (deblur progressif, lineaire)

```typescript
const anim = useBulletReveal({
  revealFrame: 10,          // Frame locale d'apparition
  animDurationFrames: 8,    // Duree de l'animation en frames
  slideX: -30,              // Optionnel, defaut: -30
  blurStart: 70,            // Optionnel, defaut: 70
});
// anim.opacity, anim.translateX, anim.blur
```

L'interpolation est **lineaire** (pas d'easing), ce qui correspond aux keyframes AE lineaires du plugin original.

### Principe de portage AE -> Remotion

Les expressions After Effects operent sur `time` (temps courant en secondes) par rapport a `inPoint` et `outPoint` du layer. En Remotion :

1. `time` -> `useCurrentFrame()` converti en secondes via `frame / fps`
2. `inPoint` -> `startFrame` (passe en parametre)
3. `outPoint` -> `startFrame + durationFrames`
4. `ease(time, t0, t1, v0, v1)` -> `interpolate(frame, [f0, f1], [v0, v1], { easing: Easing.inOut(Easing.ease) })`
5. `linear(time, t0, t1, v0, v1)` -> `interpolate(frame, [f0, f1], [v0, v1])` (lineaire par defaut)
6. Les valeurs sont toujours clampees via `extrapolateLeft: 'clamp', extrapolateRight: 'clamp'`

---

## 7. Pipeline de donnees

### Import CSV : `csvToTimeline()`

```typescript
import {csvToTimeline} from './data/csv-parser';

const timeline = csvToTimeline(csvText, mediaDB, 25);
```

Le parseur CSV est un port direct de `core/csv-parser.js` du plugin AE. Il supporte :

- **Aliases de colonnes** : chaque champ accepte plusieurs noms (ex: `timecode`, `tc`, `time`, `start`, `in` sont tous equivalents). Les alias francais sont aussi supportes (`duree`, `fondu`, `flou`, etc.)
- **Timecodes flexibles** : `HH:MM:SS:FF` (SMPTE), secondes decimales (`12.5`), virgule decimale (`12,5`)
- **Bullets delimites** : separateur `|` ou `;` (ex: `"Point 1|Point 2|Point 3"`)
- **Images multiples** : meme separateur `|` ou `;`
- **Resolution MediaDB** : les `image_key` sont resolues via le dictionnaire `mediaDB`

Les memes fichiers CSV que le plugin AE fonctionnent sans modification dans Remotion.

### Import JSON : `jsonToTimeline()`

```typescript
import {jsonToTimeline} from './data/csv-parser';

const timeline = jsonToTimeline(jsonString);
```

Accepte un JSON structurant directement un `TimelineData`. Utile pour le workflow agent IA qui genere le JSON programmatiquement. Le parseur valide et normalise la structure avec des valeurs par defaut pour chaque champ manquant.

### Donnees d'exemple

Le fichier `src/data/sample.ts` contient un `sampleTimeline` de demonstration avec 5 entries couvrant les presets principaux (Titre, Titre + Texte, Bulletpoint, Champion focus, Conclusion). Ces donnees sont utilisees comme `defaultProps` de la `<Composition>` pour le preview Remotion Studio.

### MediaDB : resolution des images

La `MediaDB` est un simple dictionnaire `{ cle: url }`. Le flux de resolution est :

1. Le CSV contient une colonne `image_key` (ex: `champions_darius`)
2. `csvToTimeline()` cherche cette cle dans le `mediaDB` fourni
3. Si trouvee, `resolvedUrl` est rempli avec l'URL correspondante
4. Le composant (ex: `<ChampionFocus>`) utilise `resolvedUrl` pour afficher l'image via `<Img>` de Remotion

---

## 8. Theme LoL

Tous les composants suivent un theme visuel coherent inspire de l'univers League of Legends.

### Palette de couleurs

| Element | Valeur | Usage |
|---|---|---|
| Fond principal | `bg-gray-900/80` | Fond semi-transparent des overlays |
| Fond renforce | `bg-gray-900/90` | Fond des overlays importants (Conclusion) |
| Fond titre | `bg-black/70` | Fond du composant Titre |
| Accent or | `#C89B3C` | Bordures, separateurs, icones bullet, noms champion |
| Bordure subtile | `rgba(200, 155, 60, 0.3-0.4)` | Bordures des cartes visuelles |
| Texte principal | `text-white` | Titres et texte principal |
| Texte secondaire | `text-gray-300` | Sous-textes et descriptions |

### Typographie

- Systeme sans-serif (herite du navigateur / Tailwind default)
- Titres : `font-bold`, tailles `text-2xl` a `text-4xl`
- Corps : `text-lg`, `leading-relaxed`
- Conclusion : `text-3xl font-semibold` avec `textShadow`

### Elements visuels

- **Bordure accent gauche** (Titre) : `borderLeft: 4px solid #C89B3C`
- **Separateur horizontal** (TitrePlusTexte, Bulletpoint) : `borderBottom: 2px solid #C89B3C`
- **Losange bullet** : caractere Unicode `&#9670;` en couleur or
- **Ombre portee** (PopUp) : `boxShadow: 0 8px 32px rgba(0,0,0,0.6)`
- **Lueur doree** (Conclusion) : `boxShadow: 0 0 40px rgba(200,155,60,0.2)`
- **Coins arrondis** : `rounded-lg` a `rounded-2xl` selon le composant
- **Image champion** : 80x80px, coins arrondis, bordure or 2px

---

## 9. Personnalisation

### Ajouter un nouveau type d'overlay

1. **Creer le composant** dans `src/components/` :

```typescript
// src/components/MonOverlay.tsx
import React from 'react';
import {TimelineEntry} from '../types';
import {OverlayWrapper} from './OverlayWrapper';

interface Props {
  entry: TimelineEntry;
  fps: number;
}

export const MonOverlay: React.FC<Props> = ({entry, fps}) => {
  const titre = entry.texts[0] ?? '';
  return (
    <OverlayWrapper entry={entry} fps={fps}>
      <div className="bg-gray-900/80 rounded-xl px-6 py-4">
        <p className="text-white text-xl">{titre}</p>
      </div>
    </OverlayWrapper>
  );
};
```

2. **Enregistrer le composant** dans `COMPONENT_MAP` dans `src/components/OverlayRoot.tsx` :

```typescript
import {MonOverlay} from './MonOverlay';

const COMPONENT_MAP: Record<string, React.FC<{entry: TimelineEntry; fps: number}>> = {
  // ... presets existants ...
  'Mon overlay': MonOverlay,
};
```

3. **Utiliser dans les donnees** : dans le CSV ou JSON, mettre `preset` = `"Mon overlay"`.

### Modifier le theme

Le theme est directement dans les classes Tailwind et les styles inline des composants. Pour un changement global :

- **Couleur accent** : chercher `#C89B3C` et `rgba(200, 155, 60, ...)` dans tous les composants
- **Couleur de fond** : modifier les classes `bg-gray-900/80`, `bg-black/70`
- **Typographie** : modifier les classes `text-*xl`, `font-bold`, etc.
- **Coins arrondis** : modifier les classes `rounded-*`

Pour un theme centralise, extraire les valeurs dans un fichier de constantes :

```typescript
// src/theme.ts
export const THEME = {
  accent: '#C89B3C',
  bgOverlay: 'rgba(17, 24, 39, 0.8)',
  textPrimary: '#FFFFFF',
  textSecondary: '#D1D5DB',
};
```

### Brancher une nouvelle source de donnees

Le systeme accepte n'importe quelle source tant qu'elle produit un `TimelineData`. Trois approches :

1. **CSV** : utiliser `csvToTimeline(csvText, mediaDB, fps)` -- le plus simple, compatible AE
2. **JSON** : utiliser `jsonToTimeline(jsonString)` -- ideal pour les agents IA
3. **Programmatique** : construire directement un objet `TimelineData` :

```typescript
const timeline: TimelineData = {
  fps: 25,
  width: 1920,
  height: 1080,
  durationInSeconds: 120,
  entries: [
    {
      id: '1',
      presetName: 'Titre',
      presetId: 'titre-1',
      startTime: 5,
      duration: 8,
      texts: ['Mon titre'],
      bullets: [],
      images: [],
      family: 'text',
      animation: {fade: 0.35, moveX: 0, moveY: -100, blur: 50},
    },
  ],
};
```

Pour passer les donnees a la composition, modifier `defaultProps` dans `src/index.tsx` ou utiliser `--props` en ligne de commande lors du rendu.

---

## 10. Correspondance AE <-> Remotion

### Table de mapping des concepts

| Concept After Effects | Equivalent Remotion | Notes |
|---|---|---|
| Composition | `<Composition>` dans `src/index.tsx` | Defini via `registerRoot` avec fps, dimensions, duree |
| Layer + `inPoint` / `outPoint` | `<Sequence from={startFrame} durationInFrames={dur}>` | `OverlayWrapper` encapsule chaque overlay dans une Sequence |
| Expression `opacity` (fade out) | `useFadeOut()` + `interpolate()` | Easing `Easing.inOut(Easing.ease)` pour reproduire `ease()` AE |
| Expression `position` (slide out) | `useSlideOut()` + `interpolate()` | Lineaire, reproduit `clamp((time-t0)/f, 0, 1)` AE |
| Expression `blur` (blur out) | `useBlurOut()` + `interpolate()` | Easing identique au fade |
| `applyOutroExpressions()` | `useOutroAnimation()` | Combine fade + slide + blur en un seul hook |
| `applyBulletRevealAnimation()` | `useBulletReveal()` | Keyframes lineaires : opacity, position X, blur |
| Comp modele (precomp) | Composant React (`<Titre>`, `<Bulletpoint>`, etc.) | Chaque preset AE correspond a un composant React |
| `effect('MB2 Fade (s)')` | `animation.fade` dans `TimelineEntry` | Les parametres d'effet AE deviennent des props |
| `effect('MB2 Move X/Y')` | `animation.moveX` / `animation.moveY` | Idem |
| `effect('MB2 Blur')` | `animation.blur` | Idem |
| CSV import (`csv-import.js`) | `csvToTimeline()` (`csv-parser.ts`) | Port TypeScript avec les memes aliases de colonnes |
| `parseTimecodeToSeconds()` | `parseTimecodeToSeconds()` | Fonction identique, portee en TypeScript |
| `pickCsvValue()` avec aliases | `pickCsvValue()` avec `CSV_FIELD_ALIASES` | Meme logique d'aliases, meme dictionnaire |
| `splitCSVLine()` (champs quotes) | `splitCSVLine()` | Port identique, gere les guillemets doubles |
| PresetDB JSON | `Preset` interface TypeScript | La structure est preservee pour compatibilite |
| Timeline / Marker | `TimelineEntry` | Un marker AE = une entry Remotion |
| MediaDB (images) | `MediaDB` interface | Meme dictionnaire cle -> chemin/URL |
| Rendu AME (Adobe Media Encoder) | `remotion render` / `npm run build` | Export MP4 via FFmpeg integre a Remotion |
| Preview RAM AE | `npm run preview` (Remotion Studio) | Preview temps reel dans le navigateur |
| `time` (temps courant) | `useCurrentFrame() / fps` | Conversion frame -> secondes |
| `thisLayer.inPoint` | `startFrame / fps` | Debut de la Sequence |
| `thisLayer.outPoint` | `(startFrame + durationFrames) / fps` | Fin de la Sequence |
| Keyframe lineaire | `interpolate()` sans easing | Comportement par defaut de Remotion |
| Keyframe avec `ease()` | `interpolate()` + `Easing.inOut(Easing.ease)` | Reproduit la courbe ease AE |
| `clamp()` | `extrapolateLeft/Right: 'clamp'` | Option de `interpolate()` |
