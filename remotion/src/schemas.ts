/**
 * Zod schemas for Remotion Studio visual editing.
 *
 * These schemas mirror the TypeScript types in types/index.ts
 * and enable the Remotion Studio props editor sidebar (Cmd+J).
 */

import {z} from 'zod';
import {zTextarea} from '@remotion/zod-types';

// ─── Sub-schemas ─────────────────────────────────────────────

const BulletEntrySchema = z.object({
  text: z.string().describe('Texte du bullet'),
  inOffset: z.number().min(0).step(0.1).optional().describe('Apparition (secondes depuis début overlay)'),
  outOffset: z.number().min(0).step(0.1).optional().describe('Disparition (secondes)'),
});

const ImageEntrySchema = z.object({
  path: z.string().optional().describe('Chemin direct ou URL'),
  key: z.string().optional().describe('Clé MediaDB (ex: champions_darius)'),
  resolvedUrl: z.string().optional().describe('URL résolue'),
});

const AnimationSchema = z.object({
  fade: z.number().min(0).max(3).step(0.05).describe('Durée fade de sortie (s)'),
  moveX: z.number().min(-500).max(500).step(10).describe('Déplacement X sortie (px)'),
  moveY: z.number().min(-500).max(500).step(10).describe('Déplacement Y sortie (px)'),
  blur: z.number().min(0).max(100).step(5).describe('Blur de sortie (px)'),
});

const PositionSchema = z.object({
  x: z.number().min(0).max(1920).step(10).describe('Position X (depuis la droite)'),
  y: z.number().min(0).max(1080).step(10).describe('Position Y'),
});

const TimelineEntrySchema = z.object({
  id: z.string().describe('ID unique'),
  presetName: z.string().describe('Type de preset (ex: Titre, Texte, Bulletpoint...)'),
  presetId: z.string().describe('ID du preset'),
  startTime: z.number().min(0).step(0.5).describe('Début (secondes)'),
  duration: z.number().min(1).max(30).step(0.5).describe('Durée (secondes)'),
  texts: z.array(z.string()).describe('Textes (slot 0 = titre, slot 1 = sous-texte, etc.)'),
  bullets: z.array(BulletEntrySchema).describe('Bullet points'),
  images: z.array(ImageEntrySchema).describe('Images'),
  position: PositionSchema.optional().describe('Position manuelle'),
  animation: AnimationSchema.optional().describe('Animation de sortie'),
  family: z.enum(['text', 'visual']).describe('Famille (text = droite, visual = plus à gauche)'),
});

const TimelineDataSchema = z.object({
  fps: z.number().min(1).max(120).step(1).describe('Images par seconde'),
  width: z.number().min(320).max(7680).step(1).describe('Largeur (px)'),
  height: z.number().min(240).max(4320).step(1).describe('Hauteur (px)'),
  durationInSeconds: z.number().min(1).step(1).describe('Durée totale (secondes)'),
  entries: z.array(TimelineEntrySchema).describe('Overlays de la timeline'),
  mediaDB: z.record(z.string(), z.string()).optional().describe('Base médias (image_key → URL)'),
});

// ─── Composition schemas ─────────────────────────────────────

export const OverlayCompositionSchema = z.object({
  timeline: TimelineDataSchema.describe('Timeline des overlays'),
});

export const CoachingCompositionSchema = z.object({
  timeline: TimelineDataSchema.describe('Timeline des overlays'),
  videoSrc: z.string().optional().describe('URL ou staticFile de la vidéo coach'),
});
