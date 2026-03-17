/**
 * Transcript → TimelineData converter
 *
 * Supported formats:
 * 1. SRT subtitles
 * 2. Simple timestamped text (HH:MM:SS ou seconds)
 * 3. JSON transcript (from Whisper, AssemblyAI, etc.)
 */

import { TimelineData, TimelineEntry, BulletEntry } from '../types';

// ─── SRT Parser ───────────────────────────────────────────────

interface SrtBlock {
  index: number;
  startTime: number;
  endTime: number;
  text: string;
}

function parseSrtTimestamp(ts: string): number {
  // Format: HH:MM:SS,mmm
  const m = ts.trim().match(/^(\d{2}):(\d{2}):(\d{2})[,.](\d{3})$/);
  if (!m) return 0;
  return parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseInt(m[3]) + parseInt(m[4]) / 1000;
}

export function parseSrt(srtText: string): SrtBlock[] {
  const blocks: SrtBlock[] = [];
  const raw = srtText.replace(/\r\n/g, '\n').trim();
  const parts = raw.split(/\n\n+/);

  for (const part of parts) {
    const lines = part.trim().split('\n');
    if (lines.length < 3) continue;

    const index = parseInt(lines[0]);
    const timeMatch = lines[1].match(/^(.+?)\s*-->\s*(.+)$/);
    if (!timeMatch) continue;

    const startTime = parseSrtTimestamp(timeMatch[1]);
    const endTime = parseSrtTimestamp(timeMatch[2]);
    const text = lines.slice(2).join(' ').trim();

    blocks.push({ index, startTime, endTime, text });
  }

  return blocks;
}

// ─── Simple timestamp parser ──────────────────────────────────

interface TimestampedLine {
  time: number;
  text: string;
}

function parseSimpleTimestamp(raw: string): number | null {
  const s = raw.trim();
  // Seconds: 12.5
  if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s);
  // MM:SS
  const m2 = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m2) return parseInt(m2[1]) * 60 + parseInt(m2[2]);
  // HH:MM:SS
  const m3 = s.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (m3) return parseInt(m3[1]) * 3600 + parseInt(m3[2]) * 60 + parseInt(m3[3]);
  // HH:MM:SS:FF (AE timecode)
  const m4 = s.match(/^(\d{1,2}):(\d{2}):(\d{2}):(\d{2})$/);
  if (m4) return parseInt(m4[1]) * 3600 + parseInt(m4[2]) * 60 + parseInt(m4[3]) + parseInt(m4[4]) / 25;
  return null;
}

export function parseTimestampedText(text: string): TimestampedLine[] {
  const lines: TimestampedLine[] = [];
  const raw = text.replace(/\r\n/g, '\n').trim().split('\n');

  for (const line of raw) {
    if (!line.trim()) continue;
    // Formats: "[00:05] texte" ou "00:05 - texte" ou "00:05: texte" ou "(5.0) texte"
    const m = line.match(/^[\[\(]?\s*([0-9:.,]+)\s*[\]\)]?\s*[-:–]?\s*(.+)$/);
    if (m) {
      const time = parseSimpleTimestamp(m[1]);
      if (time !== null) {
        lines.push({ time, text: m[2].trim() });
      }
    }
  }

  return lines;
}

// ─── Whisper/AssemblyAI JSON parser ───────────────────────────

interface WhisperSegment {
  start: number;
  end: number;
  text: string;
}

interface WhisperTranscript {
  segments?: WhisperSegment[];
  text?: string;
}

interface AssemblyAIWord {
  start: number;
  end: number;
  text: string;
  confidence: number;
}

interface AssemblyAITranscript {
  words?: AssemblyAIWord[];
  utterances?: Array<{ start: number; end: number; text: string; speaker?: string }>;
  text?: string;
}

export function parseWhisperJson(json: string): SrtBlock[] {
  const data: WhisperTranscript = JSON.parse(json);
  if (!data.segments) return [];

  return data.segments.map((seg, i) => ({
    index: i + 1,
    startTime: seg.start,
    endTime: seg.end,
    text: seg.text.trim(),
  }));
}

export function parseAssemblyAIJson(json: string): SrtBlock[] {
  const data: AssemblyAITranscript = JSON.parse(json);

  // Prefer utterances (speaker-grouped)
  if (data.utterances && data.utterances.length > 0) {
    return data.utterances.map((u, i) => ({
      index: i + 1,
      startTime: u.start / 1000, // AssemblyAI uses milliseconds
      endTime: u.end / 1000,
      text: u.text.trim(),
    }));
  }

  // Fallback to words, grouped into ~5s chunks
  if (data.words && data.words.length > 0) {
    const blocks: SrtBlock[] = [];
    let current: string[] = [];
    let blockStart = data.words[0].start / 1000;
    let blockEnd = blockStart;

    for (const word of data.words) {
      const wStart = word.start / 1000;
      const wEnd = word.end / 1000;

      if (wStart - blockStart > 5 && current.length > 0) {
        blocks.push({
          index: blocks.length + 1,
          startTime: blockStart,
          endTime: blockEnd,
          text: current.join(' '),
        });
        current = [];
        blockStart = wStart;
      }

      current.push(word.text);
      blockEnd = wEnd;
    }

    if (current.length > 0) {
      blocks.push({
        index: blocks.length + 1,
        startTime: blockStart,
        endTime: blockEnd,
        text: current.join(' '),
      });
    }

    return blocks;
  }

  return [];
}

// ─── Transcript → TimelineData ────────────────────────────────

export type OverlayStrategy = 'subtitles' | 'sections' | 'coaching';

interface TranscriptToTimelineOptions {
  fps?: number;
  width?: number;
  height?: number;
  /** Total video duration in seconds (required if transcript doesn't cover full video) */
  videoDuration?: number;
  /** How to map transcript blocks to overlays */
  strategy?: OverlayStrategy;
  /** Default preset name for each overlay */
  defaultPreset?: string;
  /** Max duration per overlay in seconds */
  maxOverlayDuration?: number;
  /** Gap between overlays in seconds (for 'sections' strategy) */
  gapBetweenOverlays?: number;
}

/**
 * Group nearby SRT blocks into longer sections for coaching overlays.
 * Blocks within `gapThreshold` seconds are merged.
 */
function groupBlocksIntoSections(
  blocks: SrtBlock[],
  gapThreshold: number = 3,
  maxDuration: number = 12
): Array<{ startTime: number; endTime: number; texts: string[] }> {
  const sections: Array<{ startTime: number; endTime: number; texts: string[] }> = [];
  let current: { startTime: number; endTime: number; texts: string[] } | null = null;

  for (const block of blocks) {
    if (!current) {
      current = { startTime: block.startTime, endTime: block.endTime, texts: [block.text] };
      continue;
    }

    const gap = block.startTime - current.endTime;
    const wouldBeDuration = block.endTime - current.startTime;

    if (gap <= gapThreshold && wouldBeDuration <= maxDuration) {
      current.endTime = block.endTime;
      current.texts.push(block.text);
    } else {
      sections.push(current);
      current = { startTime: block.startTime, endTime: block.endTime, texts: [block.text] };
    }
  }

  if (current) sections.push(current);
  return sections;
}

/**
 * Convert transcript blocks to TimelineData using the specified strategy.
 */
export function transcriptToTimeline(
  blocks: SrtBlock[],
  options: TranscriptToTimelineOptions = {}
): TimelineData {
  const {
    fps = 25,
    width = 1920,
    height = 1080,
    videoDuration,
    strategy = 'coaching',
    defaultPreset = 'Texte',
    maxOverlayDuration = 10,
    gapBetweenOverlays = 1,
  } = options;

  const lastBlock = blocks[blocks.length - 1];
  const totalDuration = videoDuration || (lastBlock ? lastBlock.endTime + 2 : 60);

  const entries: TimelineEntry[] = [];

  if (strategy === 'subtitles') {
    // 1:1 mapping — each block becomes an overlay
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      entries.push({
        id: `sub-${i}`,
        presetName: 'Texte',
        presetId: `sub-${i}`,
        startTime: b.startTime,
        duration: Math.min(b.endTime - b.startTime, maxOverlayDuration),
        texts: [b.text],
        bullets: [],
        images: [],
        family: 'text',
        animation: { fade: 0.2, moveX: 0, moveY: 0, blur: 0 },
      });
    }
  } else if (strategy === 'sections') {
    // Group blocks into sections, each section = one "Titre + Texte" overlay
    const sections = groupBlocksIntoSections(blocks, gapBetweenOverlays, maxOverlayDuration);

    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      const duration = Math.min(s.endTime - s.startTime + 1, maxOverlayDuration);

      if (s.texts.length === 1) {
        entries.push({
          id: `sec-${i}`,
          presetName: 'Texte',
          presetId: `sec-${i}`,
          startTime: s.startTime,
          duration,
          texts: [s.texts[0]],
          bullets: [],
          images: [],
          family: 'text',
        });
      } else {
        entries.push({
          id: `sec-${i}`,
          presetName: 'Titre + Texte',
          presetId: `sec-${i}`,
          startTime: s.startTime,
          duration,
          texts: [s.texts[0], s.texts.slice(1).join(' ')],
          bullets: [],
          images: [],
          family: 'text',
        });
      }
    }
  } else {
    // 'coaching' — smart grouping with bulletpoints for dense sections
    const sections = groupBlocksIntoSections(blocks, 2, maxOverlayDuration);

    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      const duration = Math.min(s.endTime - s.startTime + 2, maxOverlayDuration);

      if (s.texts.length === 1) {
        // Single sentence → Titre
        entries.push({
          id: `coach-${i}`,
          presetName: 'Titre',
          presetId: `coach-${i}`,
          startTime: s.startTime,
          duration: Math.max(duration, 4),
          texts: [s.texts[0]],
          bullets: [],
          images: [],
          family: 'text',
        });
      } else if (s.texts.length === 2) {
        // Two sentences → Titre + Texte
        entries.push({
          id: `coach-${i}`,
          presetName: 'Titre + Texte',
          presetId: `coach-${i}`,
          startTime: s.startTime,
          duration: Math.max(duration, 5),
          texts: [s.texts[0], s.texts[1]],
          bullets: [],
          images: [],
          family: 'text',
        });
      } else {
        // 3+ sentences → Bulletpoint with progressive reveal
        const bulletDuration = duration / (s.texts.length + 1);
        const bullets: BulletEntry[] = s.texts.slice(1).map((text, bi) => ({
          text,
          inOffset: (bi + 1) * bulletDuration,
        }));

        entries.push({
          id: `coach-${i}`,
          presetName: s.texts.length <= 4 ? 'Bulletpoint 3' : (s.texts.length <= 6 ? 'Bulletpoint 5' : 'Bulletpoint'),
          presetId: `coach-${i}`,
          startTime: s.startTime,
          duration: Math.max(duration, 6),
          texts: [s.texts[0]],
          bullets,
          images: [],
          family: 'text',
        });
      }
    }
  }

  return {
    fps,
    width,
    height,
    durationInSeconds: totalDuration,
    entries,
  };
}

// ─── Convenience: auto-detect format and convert ──────────────

/**
 * Auto-detect transcript format and convert to TimelineData.
 *
 * Usage:
 * ```ts
 * const timeline = transcriptToVideo(myTranscriptText, { strategy: 'coaching' });
 * ```
 */
export function transcriptToVideo(
  input: string,
  options: TranscriptToTimelineOptions = {}
): TimelineData {
  const trimmed = input.trim();

  // Try JSON first (Whisper or AssemblyAI)
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      let blocks: SrtBlock[];

      if (parsed.segments) {
        blocks = parseWhisperJson(trimmed);
      } else if (parsed.utterances || parsed.words) {
        blocks = parseAssemblyAIJson(trimmed);
      } else if (Array.isArray(parsed)) {
        // Raw array of {start, end, text}
        blocks = parsed.map((item: any, i: number) => ({
          index: i + 1,
          startTime: item.start || item.startTime || 0,
          endTime: item.end || item.endTime || (item.start || 0) + 5,
          text: item.text || '',
        }));
      } else {
        blocks = [];
      }

      return transcriptToTimeline(blocks, options);
    } catch {
      // Not valid JSON, continue
    }
  }

  // Try SRT (has --> markers)
  if (trimmed.includes('-->')) {
    const blocks = parseSrt(trimmed);
    return transcriptToTimeline(blocks, options);
  }

  // Try timestamped text
  const lines = parseTimestampedText(trimmed);
  if (lines.length > 0) {
    const blocks: SrtBlock[] = lines.map((line, i) => {
      const nextTime = i < lines.length - 1 ? lines[i + 1].time : line.time + 6;
      return {
        index: i + 1,
        startTime: line.time,
        endTime: Math.min(nextTime, line.time + 10),
        text: line.text,
      };
    });
    return transcriptToTimeline(blocks, options);
  }

  // Fallback: split by sentences, distribute evenly
  const duration = options.videoDuration || 60;
  const sentences = trimmed.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  const interval = duration / Math.max(sentences.length, 1);

  const blocks: SrtBlock[] = sentences.map((text, i) => ({
    index: i + 1,
    startTime: i * interval,
    endTime: (i + 1) * interval,
    text,
  }));

  return transcriptToTimeline(blocks, options);
}
