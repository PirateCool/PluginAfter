---
name: csv-json-pipeline
description: CSV and JSON import pipeline for Marker Builder 2 Remotion
metadata:
  tags: csv, json, import, agent, pipeline, parsing
---

## CSV import

Le même format CSV que le plugin AE fonctionne dans Remotion.

```typescript
import {csvToTimeline} from '../data/csv-parser';

const csvText = fs.readFileSync('timeline.csv', 'utf-8');
const timeline = csvToTimeline(csvText, mediaDB, 25);
```

### Colonnes CSV supportées

| Champ | Alias acceptés |
|-------|---------------|
| `time_in` | timecode, tc, time, start, in, tc_in |
| `time_out` | tc_out, out, end, fin |
| `preset` | preset_name |
| `template` | template_comp, comp, modele |
| `text` | texte, title, copy |
| `text_1..n` | Champs texte indexés |
| `bullet_1..n` | Bullets individuels |
| `bullet_1_in/out` | Timing bullet (secondes ou timecode) |
| `image_key` | media_key, asset_key |
| `image_key_1..n` | Images multiples indexées |
| `dur` | duree, duration |
| `fade` | fondu |
| `x` / `y` | movex, move_x / movey, move_y |
| `blur` | flou |
| `spawn_anchor` | anchor, position_anchor |

### Format timecode

Supporté : `HH:MM:SS:FF` (frames) ou secondes décimales (`12.5`).

```csv
time_in,time_out,preset,text,text_1,bullet_1,bullet_1_in,image_key
00:00:05:00,00:00:11:00,Titre + Texte,Mon titre,Mon sous-texte,,,
00:00:15:00,00:00:27:00,Bulletpoint,Étapes clés,,Étape 1,1.5,,
00:00:30:00,00:00:37:00,Champion focus,Darius,Fort en lane,,,champions_darius
```

## JSON import (agent IA)

Format JSON natif pour contourner les ambiguïtés CSV :

```typescript
import {jsonToTimeline} from '../data/csv-parser';

const json = fs.readFileSync('timeline.json', 'utf-8');
const timeline = jsonToTimeline(json);
```

### Structure JSON attendue

```json
{
  "fps": 25,
  "width": 1920,
  "height": 1080,
  "durationInSeconds": 120,
  "entries": [
    {
      "id": "1",
      "presetName": "Titre + Texte",
      "startTime": 5.0,
      "duration": 6.0,
      "texts": ["Mon titre", "Mon sous-texte"],
      "bullets": [],
      "images": [],
      "family": "text"
    }
  ]
}
```

## MediaDB

Résolution des `image_key` vers des URLs ou chemins :

```typescript
const mediaDB: MediaDB = {
  "champions_darius": "/assets/champions/darius.png",
  "items_trinity_force": "/assets/items/trinity_force.png",
};

const timeline = csvToTimeline(csvText, mediaDB);
```

## Règles

- TOUJOURS utiliser `csvToTimeline()` ou `jsonToTimeline()`, jamais parser manuellement
- Les alias CSV sont case-insensitive et normalisés (espaces → underscores)
- Le JSON est la source de vérité recommandée pour l'agent IA
- Les `image_key` DOIVENT exister dans la MediaDB sinon l'image sera vide
- Les timecodes `bullet_n_in/out` sont relatifs au début de la ligne si < time_in
