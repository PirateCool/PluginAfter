# Marker Builder 2

Outil de production video pour le coaching League of Legends. Marker Builder 2 gere des presets d'overlay, les place sur une timeline After Effects, et supporte l'import CSV depuis un agent IA. Le projet existe en deux versions : un plugin After Effects (ScriptUI) et une version Remotion pour le rendu directement dans le navigateur.

## Fonctionnalites principales

- **Bibliotheque de presets d'overlay** — Titre, Texte, Titre + Texte, Bulletpoint, Pop Up, Pop Icons, Champion Focus, Conclusion
- **Placement automatique** avec pile anti-overlap sur la timeline
- **Import CSV / JSON** depuis un agent IA (GPT, Claude, etc.)
- **Base medias interne** — association `image_key` vers fichier pour referencer les assets
- **Export Agent Pack** — Blueprint + Media Catalog + Instructions, pret a etre consomme par un LLM
- **Version Remotion** — rendu video MP4 sans After Effects, avec preview en temps reel

## Installation

### Plugin After Effects

Copier le fichier `Marker Builder 2.jsx` (racine du projet ou `dist/`) dans le dossier ScriptUI Panels d'After Effects :

- **Windows** : `C:\Program Files\Adobe\Adobe After Effects <version>\Support Files\Scripts\ScriptUI Panels\`
- **macOS** : `/Applications/Adobe After Effects <version>/Scripts/ScriptUI Panels/`

Relancer After Effects, puis ouvrir le panneau via **Window > Marker Builder 2**.

### Developpement (plugin AE)

```bash
npm install
npm run build
```

Le build genere `dist/Marker Builder 2.jsx` via Rollup.

### Remotion

```bash
cd remotion
npm install
```

## Utilisation

### Plugin After Effects

1. Ouvrir le panneau **Marker Builder 2** dans After Effects.
2. Selectionner un preset dans la bibliotheque.
3. Placer l'overlay au curseur de la timeline, ou importer un fichier CSV genere par un agent IA.

### Remotion — Preview

```bash
cd remotion
npm run preview
```

Lance Remotion Studio dans le navigateur pour previsualiser les compositions.

### Remotion — Rendu video

```bash
cd remotion
npm run build
```

Genere le fichier `out/video.mp4`.

## Structure du projet

```
PluginAfter/
├── src/                        # Source du plugin After Effects
│   ├── index.js                # Point d'entree
│   ├── core/                   # Logique metier
│   │   ├── ae-bridge.js        # Interface avec l'API After Effects
│   │   ├── csv-import.js       # Import de donnees CSV
│   │   ├── csv-parser.js       # Parseur CSV
│   │   ├── export.js           # Export Agent Pack
│   │   ├── placement.js        # Placement anti-overlap
│   │   ├── presets.js          # Definitions des presets d'overlay
│   │   ├── settings.js         # Parametres utilisateur
│   │   └── utils.js            # Fonctions utilitaires
│   └── ui/                     # Interface ScriptUI
│       ├── main-panel.js       # Panneau principal
│       ├── csv-wizard.js       # Assistant d'import CSV
│       ├── grid-layout.js      # Mise en page grille
│       ├── media-db.js         # Gestion de la base medias
│       └── preset-editor.js    # Editeur de presets
├── dist/                       # Build du plugin AE
│   └── Marker Builder 2.jsx
├── remotion/                   # Version Remotion (rendu navigateur)
│   ├── src/
│   │   ├── index.tsx           # Point d'entree Remotion
│   │   ├── components/         # Composants React des overlays
│   │   │   ├── Titre.tsx
│   │   │   ├── Texte.tsx
│   │   │   ├── TitrePlusTexte.tsx
│   │   │   ├── Bulletpoint.tsx
│   │   │   ├── PopUp.tsx
│   │   │   ├── PopIcons.tsx
│   │   │   ├── ChampionFocus.tsx
│   │   │   ├── Conclusion.tsx
│   │   │   ├── OverlayRoot.tsx
│   │   │   └── OverlayWrapper.tsx
│   │   ├── data/               # Donnees et parseur CSV
│   │   ├── hooks/              # Hooks d'animation
│   │   ├── styles/             # Styles globaux (Tailwind CSS)
│   │   └── types/              # Types TypeScript
│   └── package.json
├── Marker Builder 2.jsx        # Build standalone (racine)
├── rollup.config.mjs           # Configuration Rollup
└── package.json
```

## Workflow Agent IA

1. **Exporter le Agent Pack** depuis le plugin — contient le Blueprint (schema des presets), le Media Catalog (liste des assets disponibles) et les Instructions de formatage.
2. **Fournir le pack a l'agent** (GPT, Claude, etc.) avec le contexte de la video a analyser.
3. **L'agent genere un CSV conforme** au schema attendu par Marker Builder 2.
4. **Importer le CSV** dans le plugin After Effects via l'assistant d'import, ou le charger dans la version Remotion pour un rendu autonome.

## Build

| Commande | Description |
|---|---|
| `npm run build` | Construit le plugin AE via Rollup vers `dist/Marker Builder 2.jsx` |
| `cd remotion && npm run preview` | Lance Remotion Studio (preview dans le navigateur) |
| `cd remotion && npm run build` | Rendu video MP4 vers `remotion/out/video.mp4` |

## Licence

ISC
