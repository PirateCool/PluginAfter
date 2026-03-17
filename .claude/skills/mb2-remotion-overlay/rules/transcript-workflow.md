---
name: transcript-workflow
description: Converting derush transcripts to Remotion overlay timelines for LoL coaching videos
metadata:
  tags: transcript, derush, srt, whisper, coaching, conversion, pipeline
---

## Formats de transcript supportés

| Format | Détection | Exemple |
|--------|-----------|---------|
| SRT | Contient `-->` | `00:00:02,000 --> 00:00:06,000` |
| Derush horodaté | `[HH:MM:SS]` entre les mots | `[00:00:14] déjà. Commençons [00:00:15] par` |
| Whisper JSON | `{"segments": [...]}` | `{"start": 2.0, "end": 6.0, "text": "..."}` |
| AssemblyAI JSON | `{"utterances": [...]}` | `{"start": 2000, "end": 6000, "text": "..."}` |
| Texte horodaté | `MM:SS - texte` | `00:05 - Mon point clé` |
| Texte brut | Aucun timecode | Distribué uniformément |

## Pipeline transcript → vidéo

```
Transcript brut
    ↓
transcriptToVideo(text, {strategy: 'coaching'})
    ↓
TimelineData (JSON)
    ↓
Remotion render → MP4
```

## Utilisation programmatique

```typescript
import {transcriptToVideo} from './data/transcript-parser';
import fs from 'fs';

const transcript = fs.readFileSync('derush.txt', 'utf-8');
const timeline = transcriptToVideo(transcript, {
  strategy: 'coaching',    // 'subtitles' | 'sections' | 'coaching'
  fps: 25,
  videoDuration: 320,      // durée totale en secondes
});
```

## Stratégies

### `subtitles`
- 1 overlay = 1 bloc SRT
- Preset `Texte` uniquement
- Pas d'animation d'entrée, fade court (0.2s)
- Pour du sous-titrage pur

### `sections`
- Blocs proches regroupés en sections
- 1 phrase → `Texte`, 2 phrases → `Titre + Texte`
- Gap de 1-3s entre sections
- Pour du résumé structuré

### `coaching` (recommandé pour LoL)
- Groupement intelligent par densité
- 1 phrase → `Titre`
- 2 phrases → `Titre + Texte`
- 3+ phrases → `Bulletpoint` avec reveal progressif
- Bullets espacés de ~2s avec `inOffset`
- Le plus adapté au contenu coaching

## Traitement des transcripts "derush"

Les derush LoL ont un format spécifique avec timestamps mot-à-mot :

```
[00:00:14] déjà. Commençons [00:00:15] par le plus [00:00:16] important
```

Le parser reconstruit les phrases complètes avant de segmenter :
1. Fusionner les fragments entre timecodes
2. Détecter les fins de phrases (`.`, `?`, `!`)
3. Grouper en blocs pédagogiques
4. Filtrer le bruit/hésitations

## Utilisation avec l'agent IA

Pour un résultat éditorial de qualité, utiliser le prompt agent :

```bash
# Le prompt est dans remotion/prompt-agent-remotion.md
# L'agent produit un JSON TimelineData directement importable
```

L'agent IA fait un travail éditorial que le parser automatique ne fait pas :
- Reformulation des phrases brutes
- Choix intelligent des presets
- Filtrage du contenu non pertinent
- Timing éditorial adapté au rythme du coach

## Rendu depuis un transcript

```bash
# Via le parser automatique
npx ts-node render-from-transcript.ts mon_derush.txt --strategy coaching

# Via le JSON produit par l'agent
npx remotion render src/index.tsx OverlayComposition out/video.mp4 \
  --props="$(cat timeline-agent.json | jq '{timeline: .}')"

# Preview seulement (génère le JSON sans rendre)
npx ts-node render-from-transcript.ts mon_derush.txt --preview
```

## Règles

- Le parser automatique est un fallback rapide — l'agent IA produit un résultat meilleur
- TOUJOURS utiliser la stratégie `coaching` pour du contenu LoL
- Le parser ne reformule PAS le texte — l'agent si
- Pour un rendu production, passer par l'agent puis Remotion render
