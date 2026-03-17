---
name: mb2-remotion-overlay
description: Marker Builder 2 — Remotion overlay system for LoL coaching video production. Covers preset components, animation porting from AE, timeline data pipeline, CSV/JSON import, and LoL theme conventions.
triggers:
  - marker builder
  - mb2
  - overlay remotion
  - coaching lol
  - preset overlay
  - timeline overlay
  - csv timeline
  - transcript
  - derush
  - srt overlay
---

## When to use

Use this skill whenever you work on the Marker Builder 2 Remotion project (`remotion/` directory) or when creating/editing overlay components for LoL coaching videos. Also use when porting AE expressions to Remotion or building the CSV/JSON data pipeline.

## Project context

Marker Builder 2 is a video overlay system for League of Legends coaching content. It exists as:
- An After Effects plugin (`src/` — ExtendScript .jsx)
- A Remotion version (`remotion/` — React + TypeScript)

The Remotion version renders the same overlays as the AE plugin, driven by `TimelineData` (from CSV or JSON).

## How to use

Read individual rule files for domain-specific patterns:

- [rules/overlay-components.md](rules/overlay-components.md) - Creating and structuring overlay components (Titre, Bulletpoint, ChampionFocus, etc.)
- [rules/animation-porting.md](rules/animation-porting.md) - Porting AE expressions to Remotion hooks (fade, slide, blur, bullet reveal)
- [rules/timeline-data.md](rules/timeline-data.md) - TimelineData schema, TimelineEntry structure, and data flow
- [rules/csv-json-pipeline.md](rules/csv-json-pipeline.md) - CSV/JSON import, field aliases, agent IA integration
- [rules/lol-theme.md](rules/lol-theme.md) - LoL coaching visual theme (colors, typography, spacing)
- [rules/preset-mapping.md](rules/preset-mapping.md) - Mapping AE presets to React components
- [rules/media-resolution.md](rules/media-resolution.md) - MediaDB image_key resolution and asset management
- [rules/ae-remotion-bridge.md](rules/ae-remotion-bridge.md) - Correspondence between AE concepts and Remotion equivalents
- [rules/transcript-workflow.md](rules/transcript-workflow.md) - Converting derush/SRT transcripts to overlay timelines
- [rules/riot-assets.md](rules/riot-assets.md) - Riot Data Dragon CDN URLs for champions, items, spells, runes

## Key conventions

- All overlay components accept `{entry: TimelineEntry; fps: number}` as props
- Animations use `useCurrentFrame()` + `spring()` / `interpolate()`, never CSS transitions
- Components are wrapped in `<OverlayWrapper>` for positioning and outro animations
- Preset names map to components via `COMPONENT_MAP` in `OverlayRoot.tsx`
- Brand: Skillcamp.gg — `#FFDE80` gold accents, `#191E26` dark bg, font Saira, sharp corners (borderRadius: 4)
- Images from Riot Data Dragon CDN (free, no API key needed)
