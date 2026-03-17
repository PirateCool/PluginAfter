# Marker Builder 2 — Epics restants

## Statut actuel

### Complétés
- **Epic 1** : Sécurité & fondations (eval→parser safe, logging, cache)
- **Epic 2** : Modularisation (8 core + 5 UI modules, rollup build)
- **Epic 6** : Fondations Remotion (types, hooks, projet)
- **Epic 7** : Composants overlay (9 composants, brand Skillcamp.gg)
- **Epic 8** : Pipeline données (CSV/JSON parser, transcript parser, MediaDB)
- **Epic 9 partiel** : Remotion Studio avec Zod schema visual editing

### En cours / Partiels
- **Epic 3** : Robustesse CSV/données (3.1 JSON natif = fait côté Remotion, reste côté AE)
- **Epic 4** : UI ScriptUI (non commencé)
- **Epic 5** : CEP/HTML (optionnel, pas prioritaire)

---

## Epic 10 : Pont Remotion ↔ After Effects (NOUVEAU)

> Fermer la boucle entre les deux versions : un même JSON timeline alimente AE et Remotion.

| # | Tâche | Priorité | Effort | Description |
|---|-------|----------|--------|-------------|
| 10.1 | **JSON → CSV converter** | HIGH | S | Script Node/TS qui convertit un `TimelineData` JSON en CSV MB2 importable par le plugin AE (colonnes exactes de `CSV_Template_Agent.csv`) |
| 10.2 | **Import JSON natif dans le plugin AE** | HIGH | M | Ajouter un bouton "Import JSON" dans le plugin qui lit un `TimelineData` et exécute le placement (bypass le wizard CSV) |
| 10.3 | **Render transparent Remotion → AE** | MEDIUM | S | Script/commande qui rend les overlays en WebM VP8 transparent ou ProRes 4444, importable comme layer AE |
| 10.4 | **Export AE → JSON timeline** | MEDIUM | M | Le plugin AE exporte ses marqueurs/layers AUTO en `TimelineData` JSON, réutilisable par Remotion |
| 10.5 | **Sync bidirectionnel** | LOW | L | Un watch mode : modifier le JSON → re-render Remotion OU re-import dans AE automatiquement |

### Flow cible

```
                    ┌─────────────┐
                    │  Agent IA   │
                    │  (Claude)   │
                    └──────┬──────┘
                           │ JSON TimelineData
                    ┌──────▼──────┐
                    │   Source    │
                    │   unique   │
                    └──┬─────┬───┘
                       │     │
            ┌──────────▼┐   ┌▼──────────┐
            │  Remotion  │   │  Plugin AE │
            │  (render)  │   │  (import)  │
            └──────┬─────┘   └─────┬─────┘
                   │               │
            ┌──────▼─────┐  ┌──────▼─────┐
            │   MP4/WebM  │  │  Comp AE   │
            │  (direct)   │  │  (édition) │
            └─────────────┘  └────────────┘
```

---

## Epic 11 : Pipeline de production complet (NOUVEAU)

> De la vidéo brute au rendu final en une commande.

| # | Tâche | Priorité | Effort | Description |
|---|-------|----------|--------|-------------|
| 11.1 | **Transcription auto** (Whisper) | HIGH | M | Intégrer Whisper local ou API pour transcrire automatiquement la vidéo du coach |
| 11.2 | **Agent IA → JSON** | HIGH | M | Pipeline automatisé : transcript → prompt agent → JSON TimelineData (via Claude API) |
| 11.3 | **CLI tout-en-un** | HIGH | M | `npx mb2 render video.mp4` → transcrit, génère la timeline, rend avec overlays |
| 11.4 | **Mode batch** | MEDIUM | L | Traiter N vidéos en parallèle avec N timelines |
| 11.5 | **Hot reload** | LOW | M | Watch mode : modifier le JSON → re-render automatique |

---

## Epic 3 (suite) : Robustesse données

| # | Tâche | Priorité | Effort | Statut |
|---|-------|----------|--------|--------|
| 3.1 | Mode JSON natif agent IA | HIGH | M | ✅ Fait (Remotion), reste AE (→ Epic 10.2) |
| 3.2 | Dédupliquer detectTemplateFieldSchema/auditTemplateContract | MEDIUM | S | À faire |
| 3.3 | Clarifier preset.textSlots vs CSV override | MEDIUM | S | À faire |
| 3.4 | Validation schéma import JSON presets | MEDIUM | S | À faire |
| 3.5 | Preview visuel dry-run | LOW | L | À faire |

## Epic 4 : Qualité UI ScriptUI

| # | Tâche | Priorité | Effort | Statut |
|---|-------|----------|--------|--------|
| 4.1 | Unifier éditeur preset (popup seul) | HIGH | S | À faire |
| 4.2 | Panneau de statut riche (mini-log scrollable) | MEDIUM | M | À faire |
| 4.3 | Responsive layout | MEDIUM | S | À faire |
| 4.4 | Raccourcis clavier | LOW | S | À faire |
| 4.5 | Mode compact fonctionnel | LOW | S | À faire |

## Epic 9 (suite) : UI Remotion

| # | Tâche | Priorité | Effort | Statut |
|---|-------|----------|--------|--------|
| 9.1 | Remotion Player intégré | HIGH | S | ✅ Fait (Studio) |
| 9.2 | Éditeur de timeline drag & drop | MEDIUM | L | À faire (Editor Starter payant ou custom) |
| 9.3 | Éditeur de preset live | MEDIUM | M | ✅ Fait (Zod schema visual editing) |
| 9.4 | Import/export JSON | MEDIUM | M | ✅ Fait (--props) |
| 9.5 | Mode batch | LOW | L | À faire (→ Epic 11.4) |

---

## Ordre d'exécution recommandé

```
Prochaine priorité:
  Epic 10.1 (JSON→CSV) → Epic 10.2 (Import JSON dans AE) → Epic 10.3 (Transparent render)

Puis:
  Epic 11.1 (Whisper) → Epic 11.2 (Agent auto) → Epic 11.3 (CLI)

Polish:
  Epic 3 suite → Epic 4 → Epic 9.2
```
