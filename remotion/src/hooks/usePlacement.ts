/**
 * Placement system — overlays on the RIGHT side, vertically centered.
 *
 * In a 1920x1080 comp:
 * - Coach video fills the screen, coach visible on LEFT
 * - Text overlays stack vertically in the RIGHT zone, centered vertically
 * - Visual overlays placed further left
 */

import {TimelineEntry} from '../types';

// ─── Layout constants ────────────────────────────────────────

/** Y zone for overlays: vertically centered in the frame */
const ZONE_TOP = 120;      // minimum top padding
const ZONE_BOTTOM = 960;   // maximum bottom (1080 - 120)
const ZONE_HEIGHT = ZONE_BOTTOM - ZONE_TOP; // 840px usable

/** Spacing between stacked overlays */
const STACK_GAP_PX = 24;

/** Estimated heights per preset type (with new larger sizing) */
const PRESET_HEIGHTS: Record<string, number> = {
  'Titre': 110,
  'Texte': 120,
  'Titre + Texte': 170,
  'Bulletpoint': 340,
  'Bulletpoint 3': 260,
  'Bulletpoint 5': 320,
  'Bulletpoint 9': 480,
  'Erreur à éviter': 170,
  'Astuce coach': 170,
  'Checklist': 320,
  'Conclusion': 150,
  'Pop up': 180,
  'Pop icons': 140,
  'Champion focus': 170,
  'Item focus': 170,
  'Spell / Rune': 170,
  'Objectif': 170,
};

// ─── Overlap detection ──────────────────────────────────────

function overlapsTime(a: TimelineEntry, b: TimelineEntry): boolean {
  const aEnd = a.startTime + a.duration;
  const bEnd = b.startTime + b.duration;
  return a.startTime < bEnd && b.startTime < aEnd;
}

// ─── Placement computation ──────────────────────────────────

export interface PlacedEntry {
  entry: TimelineEntry;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Compute non-overlapping positions for all entries.
 * Single overlay: vertically centered in the right zone.
 * Multiple concurrent: stacked from a centered start point.
 */
export function computePlacements(
  entries: TimelineEntry[],
  compWidth: number = 1920,
  compHeight: number = 1080
): PlacedEntry[] {
  const placements: PlacedEntry[] = [];
  const sorted = [...entries].sort((a, b) => a.startTime - b.startTime);

  for (const entry of sorted) {
    const estHeight = PRESET_HEIGHTS[entry.presetName] || 120;
    const estWidth = entry.family === 'visual' ? 220 : 680;

    // Find concurrent already-placed entries
    const concurrent = placements.filter(p => overlapsTime(p.entry, entry));
    const sameFamilyConcurrent = concurrent.filter(p => p.entry.family === entry.family);

    if (sameFamilyConcurrent.length === 0) {
      // Single overlay: vertically center it in the zone
      const y = ZONE_TOP + Math.max(0, (ZONE_HEIGHT - estHeight) / 2);

      placements.push({
        entry,
        x: 0,
        y: Math.round(y),
        width: estWidth,
        height: estHeight,
      });
    } else {
      // Multiple concurrent: stack below the last one
      let maxBottom = ZONE_TOP;
      for (const p of sameFamilyConcurrent) {
        maxBottom = Math.max(maxBottom, p.y + p.height + STACK_GAP_PX);
      }

      // If stacking would go off screen, start from top
      if (maxBottom + estHeight > ZONE_BOTTOM) {
        maxBottom = ZONE_TOP;
      }

      placements.push({
        entry,
        x: 0,
        y: Math.round(maxBottom),
        width: estWidth,
        height: estHeight,
      });
    }
  }

  return placements;
}

/**
 * Get placement for a specific entry from precomputed placements.
 */
export function getPlacement(
  placements: PlacedEntry[],
  entryId: string
): {x: number; y: number} | null {
  const found = placements.find(p => p.entry.id === entryId);
  return found ? {x: found.x, y: found.y} : null;
}
