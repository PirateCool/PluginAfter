/**
 * Placement system — port of the AE plugin's stack_anchor logic.
 *
 * In a 1920x1080 comp, overlays are placed on the RIGHT side:
 * - Text family: stacked vertically from an anchor point
 * - Visual family: placed in a multi-column grid to the left of text
 *
 * This module computes Y positions to avoid overlap between
 * simultaneously visible overlays.
 */

import {TimelineEntry} from '../types';

// ─── Layout constants (match AE plugin) ─────────────────────

/** Anchor point for the stack — right side of the screen */
const STACK_ANCHOR_X = 1920 * 0.78;  // ~1498px from left = right side
const STACK_ANCHOR_Y = 100;          // top padding

/** Spacing between stacked text overlays */
const STACK_GAP_PX = 24;

/** Estimated heights per preset type */
const PRESET_HEIGHTS: Record<string, number> = {
  'Titre': 64,
  'Texte': 80,
  'Titre + Texte': 110,
  'Bulletpoint': 220,
  'Bulletpoint 3': 160,
  'Bulletpoint 5': 200,
  'Bulletpoint 9': 320,
  'Erreur à éviter': 110,
  'Astuce coach': 110,
  'Checklist': 200,
  'Conclusion': 100,
  'Pop up': 160,
  'Pop icons': 100,
  'Champion focus': 120,
  'Item focus': 120,
  'Spell / Rune': 120,
  'Objectif': 120,
};

/** Visual family overlays go further left */
const VISUAL_OFFSET_X = -320;
const VISUAL_COL_WIDTH = 200;
const VISUAL_MAX_COLS = 3;

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
 * Text family stacks vertically from top.
 * Visual family uses a multi-column layout to the left.
 */
export function computePlacements(
  entries: TimelineEntry[],
  compWidth: number = 1920,
  compHeight: number = 1080
): PlacedEntry[] {
  const placements: PlacedEntry[] = [];

  // Sort by startTime for consistent stacking
  const sorted = [...entries].sort((a, b) => a.startTime - b.startTime);

  for (const entry of sorted) {
    const isVisual = entry.family === 'visual';
    const estHeight = PRESET_HEIGHTS[entry.presetName] || 100;
    const estWidth = isVisual ? 200 : 448; // max-w-md = 448px

    // Find all already-placed entries that overlap in time with this one
    const concurrent = placements.filter(p => overlapsTime(p.entry, entry));

    if (isVisual) {
      // Visual: place in columns to the left of the text stack
      const visualConcurrent = concurrent.filter(p => p.entry.family === 'visual');

      // Find first free column slot
      let col = 0;
      let yOffset = 0;
      let placed = false;

      for (col = 0; col < VISUAL_MAX_COLS && !placed; col++) {
        const colX = VISUAL_OFFSET_X + col * VISUAL_COL_WIDTH;
        let y = STACK_ANCHOR_Y;

        // Check vertical overlap in this column
        const inThisCol = visualConcurrent.filter(p => {
          const px = p.x - (compWidth - STACK_ANCHOR_X);
          return Math.abs(px - colX) < VISUAL_COL_WIDTH;
        });

        if (inThisCol.length === 0) {
          yOffset = y;
          placed = true;
          break;
        }

        // Stack below existing in this column
        for (const p of inThisCol) {
          y = Math.max(y, p.y + p.height + STACK_GAP_PX);
        }
        yOffset = y;
        placed = true;
      }

      if (!placed) {
        yOffset = STACK_ANCHOR_Y;
        col = 0;
      }

      placements.push({
        entry,
        x: compWidth - STACK_ANCHOR_X + VISUAL_OFFSET_X + (col > 0 ? col * VISUAL_COL_WIDTH : 0),
        y: yOffset,
        width: estWidth,
        height: estHeight,
      });
    } else {
      // Text: stack vertically from anchor
      const textConcurrent = concurrent.filter(p => p.entry.family === 'text');

      let y = STACK_ANCHOR_Y;
      for (const p of textConcurrent) {
        y = Math.max(y, p.y + p.height + STACK_GAP_PX);
      }

      placements.push({
        entry,
        x: 0, // positioned via `right` in CSS, x=0 means default right margin
        y,
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
