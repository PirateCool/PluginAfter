# Marker Builder 2 -- Architecture

## 1. Vue d'ensemble

Marker Builder 2 est un outil de production video dedie au coaching League of Legends.
Il automatise la creation d'overlays (titres, bullet points, pop-ups visuels, focus champion, etc.) en synchronisation avec une timeline video.

Le projet existe en **deux versions** :

| Version | Technologie | Cible |
|---------|------------|-------|
| **Plugin AE** | ExtendScript (ES3) bundle en `.jsx` | After Effects -- placement de markers, injection de texte/image dans des compositions modeles |
| **Remotion** | React + TypeScript | Rendu video autonome via Remotion -- meme logique d'overlays, sans After Effects |

Les deux versions partagent le meme schema de presets et le meme format de donnees CSV/JSON.

---

## 2. Structure du projet

```
PluginAfter/
|
|-- package.json                  # deps de build (rollup)
|-- rollup.config.mjs             # config rollup : bundle IIFE pour AE
|-- Marker Builder 2.jsx          # fichier legacy (pre-modularisation)
|
|-- src/                          # ===== PLUGIN AFTER EFFECTS =====
|   |-- index.js                  # point d'entree rollup
|   |-- core/
|   |   |-- utils.js              # fonctions utilitaires partagees (log, JSON safe, trim, clamp)
|   |   |-- csv-parser.js         # parsing CSV, aliases de champs, timecodes
|   |   |-- settings.js           # persistance preferences AE (app.settings)
|   |   |-- presets.js            # modele de donnees presets, DB par defaut, sanitization
|   |   |-- ae-bridge.js          # bridge AE : comps, layers, markers, expressions, sliders
|   |   |-- placement.js          # logique de placement spatial (stack, grid, ancres)
|   |   |-- csv-import.js         # import CSV : validation, resolution presets, execution
|   |   |-- export.js             # export agent pack, catalogues medias, CSV template
|   |
|   |-- ui/
|       |-- main-panel.js         # panneau principal ScriptUI (palette AE)
|       |-- preset-editor.js      # editeur de preset (popup dialog)
|       |-- csv-wizard.js         # assistant d'import CSV avec preview et mapping
|       |-- media-db.js           # gestionnaire de base medias (dialog)
|       |-- grid-layout.js        # configuration grille de placement (dialog)
|
|-- remotion/                     # ===== VERSION REMOTION =====
|   |-- package.json
|   |-- remotion.config.ts
|   |-- tsconfig.json
|   |-- postcss.config.js
|   |-- src/
|       |-- index.tsx             # point d'entree Remotion (registerRoot)
|       |-- types/
|       |   |-- index.ts          # types TypeScript (Preset, TimelineEntry, TimelineData, etc.)
|       |-- hooks/
|       |   |-- useAnimations.ts  # hooks d'animation (portage des expressions AE)
|       |-- components/
|       |   |-- OverlayRoot.tsx   # composant racine : dispatch preset -> composant
|       |   |-- OverlayWrapper.tsx # wrapper timing/position pour chaque overlay
|       |   |-- Titre.tsx
|       |   |-- Texte.tsx
|       |   |-- TitrePlusTexte.tsx
|       |   |-- Bulletpoint.tsx
|       |   |-- PopUp.tsx
|       |   |-- PopIcons.tsx
|       |   |-- ChampionFocus.tsx
|       |   |-- Conclusion.tsx
|       |-- data/
|       |   |-- csv-parser.ts     # parser CSV cote Remotion
|       |   |-- sample.ts         # donnees de test
|       |-- styles/
|           |-- global.css
|
|-- dist/                         # sortie rollup (Marker Builder 2.jsx)
```

---

## 3. Plugin AE -- Architecture modulaire

### 3.1 Diagramme de dependances

```
                    +----------+
                    |  utils   |  (log, JSON safe, trim, clamp, makeId)
                    +----+-----+
                         |
            +------------+-------------+
            |            |             |
       +----v----+  +----v-----+  +---v------+
       |csv-parse|  | settings |  | presets  |
       +---------+  +----+-----+  +----+-----+
            |             |            |
            +-------+-----+-----+-----+
                    |           |
               +----v----+ +---v-------+
               |ae-bridge| | (presets) |
               +----+----+ +-----------+
                    |
          +---------+---------+
          |                   |
     +----v-----+      +-----v-----+
     |placement |      | csv-import|
     +----+-----+      +-----+-----+
          |                   |
          +---+--------+------+
              |        |
         +----v--+ +---v-----+
         |export | | (utils) |
         +-------+ +---------+

  UI layer :
     main-panel  -->  preset-editor, csv-wizard, media-db, grid-layout
         |
         +-- importe tout : core/* + ui/*
```

Detail des fleches :

```
utils         <-- csv-parser, settings, presets, ae-bridge, placement, csv-import, export, tous les UI
csv-parser    <-- csv-import, csv-wizard, main-panel, export
settings      <-- ae-bridge, placement, main-panel, grid-layout
presets       <-- ae-bridge, placement, csv-import, main-panel, preset-editor
ae-bridge     <-- placement, csv-import, main-panel, csv-wizard, media-db, grid-layout
placement     <-- csv-import, main-panel
csv-import    <-- csv-wizard, main-panel
export        <-- main-panel, media-db
```

### 3.2 Modules core

#### `utils.js`
Fonctions utilitaires pures sans dependance AE :
- `mb2Log(level, msg)` -- logging centralise via `$.writeln`
- `parseJSON(s)` / `stringifyJSON(v)` -- parser JSON safe ecrit a la main (remplace `eval()`)
- `trim`, `toNum`, `clamp01`, `clampInt` -- normalisation de valeurs
- `makeId()` -- generateur d'identifiants uniques (timestamp hex + random)
- `escStr`, `normalizeKey`, `pad3` -- formatage de chaines

#### `csv-parser.js`
Parsing CSV conforme RFC (guillemets doubles, echappement) :
- `splitCSVLine(line)` -- decoupe une ligne CSV en cellules
- `parseCSVRaw(raw)` -- parse un fichier complet en `{ headers, rows }`
- `CSV_FIELD_ALIASES` -- dictionnaire d'alias multilingues (fr/en) pour chaque champ (timecode, preset, text, image, bullets, etc.)
- `pickCsvValue(row, field)` -- resolution d'un champ via ses alias
- `detectCsvMapping(headers)` -- detection automatique du mapping colonnes -> champs
- `parseTimecodeToSeconds` / `parseCsvTimeFlexible` -- conversion timecodes `HH:MM:SS:FF` ou secondes
- `csvCell`, `csvLine` -- serialisation CSV

#### `settings.js`
Persistance via `app.settings` (preferences AE) :
- Section `MarkerBuilder2` avec cles pour la DB presets, la media DB, la configuration grille
- `loadGridLayoutConfig()` / `saveGridLayoutConfig()` -- grille de placement (position %, colonnes, lignes)
- `sanitizeGridLayoutConfig()` -- validation avec bornes (clamp 0-1, cols 2-24, rows 2-24)

#### `presets.js`
Modele de donnees central :
- `LABELS` -- couleurs de markers AE (Jaune, Rouge, Orange, Vert, Bleu, Violet, Brun, Gris, Noir)
- `builtinPresetProfile(name)` -- profils builtin avec description, textSlots, imageSlots, famille (`text` / `visual`)
- 17 presets builtin : Titre, Texte, Titre + Texte, Bulletpoint (3/5/9), Pop up, Pop icons, Champion focus, Item focus, Spell / Rune, Objectif, Erreur a eviter, Astuce coach, Checklist, Conclusion
- `presetDefaults(name, db)` -- cree un preset complet avec valeurs par defaut (dur=6s, fade=0.35s, moveY=-100, blur=50, anchor=middle_right)
- `sanitizePreset(p, db)` -- validation exhaustive de chaque champ
- `defaultDB()` -- DB initiale avec categories "Essentiels" et "Habillage"
- `sanitizeDB(db)` -- garantit la presence de tous les presets builtin

#### `ae-bridge.js`
Interface avec l'API After Effects :
- Constantes : `GEN_FOLDER_NAME` (`_AUTO_FROM_MARKERS_2`), tags de markers (`[MB2]`, `[MB2_LAYER]`, `[MB2_GRID_GUIDE]`)
- Constantes de placement : `MB2_STACK_UNIT_PX` (120), `MB2_STACK_GAP_PX` (24), `MB2_VISUAL_COLS` (3)
- Helpers comps/layers : `activeComp()`, `clearLayerSelection()`, `findCompByName()`, `getOrCreateFolder()`
- Markers : `buildMarkerComment()`, `parseMarkerComment()`, `addMarker()`, `getAllMarkers()`
- Expressions : `ensureSlider()`, `ensureBlur()`, `setExpr()`, `applyOutroExpressions()`
- Persistence DB : `loadDB()`, `saveDB()`, `loadMediaDB()`, `saveMediaDB()`
- Audit template : `detectTemplateFieldSchema()`, `auditTemplateContract()`

#### `placement.js`
Logique de placement spatial des overlays dans la composition AE :
- Systeme de cache runtime (`placementRuntimeCache`) pour eviter les recalculs
- Placement par ancre (stack_anchor) : empile les overlays a partir d'un point d'ancrage (9 positions)
- Gestion des familles : `text` (stack vertical) vs `visual` (grille colonnes)
- Integration avec la grille configurable (settings)

#### `csv-import.js`
Pipeline d'import CSV complet :
- `findPresetByNameInDB(name, category, db)` -- resolution preset par nom
- Validation des lignes CSV : verification preset, timecodes, template existant
- Execution : creation de markers AE + placement des presets via `placePresetAtTime`
- Rapport de validation avec erreurs/warnings

#### `export.js`
Fonctions d'export pour l'agent IA :
- `writeTextFile(fileObj, text)` -- ecriture fichier UTF-8
- `mediaCatalogRows(mediaDbObj)` -- inventaire des medias avec verification d'existence
- Generateurs : `buildPresetCatalogTxt`, `buildMediaCatalogCsv/Txt`, `buildCsvTemplateAgent`, `buildAgentInstructionsText`, `buildAgentReadmeText`

### 3.3 Modules UI

#### `main-panel.js`
Panneau principal (palette ScriptUI) :
- `buildUI(thisObj)` -- construit l'interface complete
- Charge la DB et la mediaDB au demarrage
- Modes : normal, compact, favoris uniquement, CSV direct, mode securise
- Orchestrateur : connecte tous les modules core et UI

#### `preset-editor.js`
Popup d'edition de preset :
- `SPAWN_ITEMS` -- 9 positions d'ancrage avec labels francais
- `openPresetEditorPopup()` -- dialog d'edition (modele comp, duree, fade, position, layout, slots)
- `openTemplateAuditAction()` -- audit de conformite template

#### `csv-wizard.js`
Assistant d'import CSV :
- `runCsvWizard()` -- affiche le preview CSV, le mapping detecte, le rapport de validation
- Mode strict blueprint pour validation agent IA
- Preview tronque des cellules (24 chars max)

#### `media-db.js`
Gestionnaire de la base de medias interne :
- `openMediaDbWindow()` -- dialog de gestion (ajout, suppression, scan dossier)
- Generation automatique de cles a partir des chemins fichiers
- Export du catalogue en CSV/TXT

#### `grid-layout.js`
Configuration de la grille de placement :
- `removeGridPreviewLayers(comp)` -- nettoyage des guides visuels
- `openGridLayoutWindow()` -- dialog de configuration (position, taille, colonnes, lignes)
- Preview en temps reel dans la composition AE

### 3.4 Build system

Rollup concatene tous les modules ES en un seul fichier `.jsx` compatible ExtendScript :

```javascript
// rollup.config.mjs
export default {
  input: "src/index.js",
  output: {
    file: "dist/Marker Builder 2.jsx",
    format: "es",
    banner: "(function(thisObj){",
    footer: "})(this);",
  },
  plugins: [resolve()],
};
```

Le resultat est une **IIFE** auto-executee. Le format `es` est utilise car ExtendScript ne supporte pas les vrais modules -- Rollup inline tout et le wrapper IIFE isole le scope.

---

## 4. Version Remotion -- Architecture

### 4.1 Types TypeScript

Le fichier `remotion/src/types/index.ts` definit le schema de donnees partage :

- **`Preset`** -- meme structure que le plugin AE (id, name, dur, fade, moveX/Y, blur, spawnAnchor, textSlots, imageSlots, family)
- **`PresetDB`** -- base de presets avec categories
- **`TimelineEntry`** -- une entree de timeline (presetName, startTime, duration, texts[], bullets[], images[])
- **`BulletEntry`** -- point de bullet avec offsets temporels optionnels (inOffset, outOffset)
- **`ImageEntry`** -- image avec path, key (media DB) et URL resolue
- **`MediaDB`** -- dictionnaire cle -> chemin
- **`TimelineData`** -- conteneur principal (fps, width, height, durationInSeconds, entries[], mediaDB)
- **`OverlayRootProps`** -- props de la composition racine

Types enumeres : `PresetFamily` (`text` | `visual`), `LayoutMode`, `SpawnAnchor` (9 positions).

### 4.2 Hooks d'animation

`remotion/src/hooks/useAnimations.ts` porte les expressions After Effects en hooks React :

- **`useFadeOut(params)`** -- reproduit l'expression AE d'opacite de sortie :
  - Calcul en frames locales (frame - startFrame)
  - Interpolation ease de 100 a 0 sur la duree de fade
  - Utilise `interpolate` et `Easing` de Remotion

Chaque hook recoit `{ startFrame, durationFrames, fadeDurationSeconds }` et utilise `useCurrentFrame()` / `useVideoConfig()`.

### 4.3 Composants overlay

**`OverlayRoot.tsx`** est le composant racine. Il contient un `COMPONENT_MAP` qui associe chaque nom de preset a un composant React :

| Preset | Composant |
|--------|-----------|
| Titre | `Titre` |
| Texte | `Texte` |
| Titre + Texte, Erreur a eviter, Astuce coach | `TitrePlusTexte` |
| Bulletpoint, Bulletpoint 3/5/9, Checklist | `Bulletpoint` |
| Pop up | `PopUp` |
| Pop icons | `PopIcons` |
| Champion focus, Item focus, Spell / Rune, Objectif | `ChampionFocus` |
| Conclusion | `Conclusion` |

Chaque composant recoit `{ entry: TimelineEntry, fps: number }`. L'`OverlayWrapper` gere le timing (Sequence Remotion) et le positionnement.

Fallback : si le preset n'est pas dans le map, le composant `Texte` est utilise.

### 4.4 Pipeline de donnees

```
CSV / JSON
    |
    v
csv-parser.ts  (parse + mapping champs)
    |
    v
TimelineData   { fps, width, height, entries[], mediaDB }
    |
    v
OverlayRoot    (itere sur entries)
    |
    v
COMPONENT_MAP[entry.presetName]  -->  composant React specifique
    |
    v
OverlayWrapper (timing + position + animations via useAnimations)
    |
    v
Rendu Remotion (video MP4)
```

---

## 5. Flux de donnees

### 5.1 Plugin AE

```
PresetDB (settings AE)
    |
    v
main-panel : selection preset
    |
    v
placePresetAtCTI()  -->  ae-bridge :
    |                      - findCompByName(modelComp)
    |                      - addMarker() sur la comp active
    |                      - duplicate + placement spatial
    |                      - ensureSlider() pour dur/fade/moveX/Y/blur
    |                      - setExpr() pour expressions d'animation
    |                      - injection texte dans les layers texte
    |                      - injection image via mediaDB
    v
Composition AE avec overlays animes
```

### 5.2 Remotion

```
JSON / CSV (fichier ou inline)
    |
    v
TimelineData (type TypeScript)
    |
    v
OverlayRoot : map entries -> composants React
    |
    v
OverlayWrapper : Sequence Remotion (from/durationInFrames)
    |              + positionnement CSS (spawnAnchor -> transform)
    |              + animations (useFadeOut, useSlideIn, etc.)
    v
Composants specifiques : Titre, Bulletpoint, PopUp, etc.
    |
    v
Remotion render -> MP4
```

### 5.3 Agent IA

```
Plugin AE : export Agent Pack
    |
    +-- preset-catalog.txt    (liste des presets avec description, slots, famille)
    +-- media-catalog.csv     (inventaire des medias disponibles)
    +-- csv-template.csv      (template CSV vide avec headers corrects)
    +-- instructions.txt      (guide pour l'agent IA)
    |
    v
Agent IA genere un CSV conforme
    |
    v
Import dans AE (csv-wizard / csv-import)
    ou
Import dans Remotion (csv-parser.ts -> TimelineData)
```

---

## 6. Securite

### 6.1 Remplacement de `eval()` par un parser JSON safe

ExtendScript ne dispose pas de `JSON.parse` natif. Au lieu d'utiliser `eval()` (risque d'injection de code), `utils.js` implemente un **parser JSON recursif complet** :

- `parseJSON(s)` -- parser caractere par caractere avec machine a etats
- Gere : strings (avec echappement unicode `\uXXXX`), nombres, booleens, null, tableaux, objets
- Leve une `Error` explicite en cas de syntaxe invalide (pas d'execution de code arbitraire)
- `stringifyJSON(v)` -- serialisation safe avec echappement complet

### 6.2 Logging centralise

- `mb2Log(level, msg)` avec niveaux debug/info/warn
- Mode debug activable via `MB2_DEBUG`
- Protege par try/catch pour ne jamais bloquer l'execution

### 6.3 Cache invalidation amelioree

- `placementRuntimeCache` dans `placement.js` : cache des calculs de position lie a la composition active
- `clearPlacementRuntimeCache()` pour invalidation explicite
- `invalidateModelCompListCache()` dans `ae-bridge.js` pour forcer le re-scan des compositions modeles
- Le cache est invalide a chaque changement de composition active
