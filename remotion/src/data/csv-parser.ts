import {TimelineData, TimelineEntry, BulletEntry, ImageEntry, MediaDB} from '../types';

// --- Utility helpers (ported from core/utils.js) ---

function trim(s: string | undefined | null): string {
  return (s || '').replace(/^\s+|\s+$/g, '');
}

function toNum(v: unknown, def: number): number {
  const n = parseFloat(String(v));
  return isNaN(n) ? def : n;
}

function normalizeKey(s: string | undefined | null): string {
  return trim(String(s || '')).toLowerCase().replace(/\s+/g, '_');
}

// --- CSV field aliases (ported from core/csv-parser.js) ---

export const CSV_FIELD_ALIASES: Record<string, string[]> = {
  timecode: ['timecode', 'tc', 'time', 'start', 'in'],
  time_in: ['time_in', 'tc_in', 'in', 'start', 'debut', 'timecode_in'],
  time_out: ['time_out', 'tc_out', 'out', 'end', 'fin', 'timecode_out'],
  template: ['template', 'template_comp', 'comp', 'modele', 'model_comp'],
  text: ['text', 'texte', 'title', 'copy'],
  image: ['image', 'image_path', 'img', 'photo', 'media'],
  image_key: ['image_key', 'media_key', 'asset_key', 'key_image'],
  preset: ['preset', 'preset_name'],
  category: ['category', 'categorie', 'cat'],
  bullets: ['bullets', 'bullet_points', 'bulletpoint', 'liste'],
  text_slots: ['text_slots', 'texts', 'nb_textes', 'text_count'],
  image_slots: ['image_slots', 'images', 'nb_images', 'image_count'],
  dur: ['dur', 'duree', 'duration'],
  fade: ['fade', 'fondu'],
  x: ['x', 'movex', 'move_x', 'offset_x'],
  y: ['y', 'movey', 'move_y', 'offset_y'],
  spawn_anchor: ['spawn_anchor', 'anchor', 'position_anchor', 'apparition_anchor'],
  spawn_x: ['spawn_x', 'spawn_offset_x', 'apparition_x'],
  spawn_y: ['spawn_y', 'spawn_offset_y', 'apparition_y'],
  blur: ['blur', 'flou'],
  color: ['color', 'couleur', 'marker_color', 'label'],
};

// --- Core CSV functions ---

/**
 * Split a single CSV line respecting quoted fields.
 * Ported from core/csv-parser.js splitCSVLine.
 */
export function splitCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  let i = 0;
  while (i < line.length) {
    const ch = line.charAt(i);
    if (ch === '"') {
      if (inQ && i + 1 < line.length && line.charAt(i + 1) === '"') {
        cur += '"';
        i += 2;
        continue;
      }
      inQ = !inQ;
      i++;
      continue;
    }
    if (ch === ',' && !inQ) {
      out.push(cur);
      cur = '';
      i++;
      continue;
    }
    cur += ch;
    i++;
  }
  out.push(cur);
  return out;
}

/**
 * Parse raw CSV text into headers + row objects.
 * Ported from core/csv-parser.js parseCSVRaw.
 */
export function parseCSVRaw(raw: string): {headers: string[]; rows: Record<string, string>[]} {
  const text = String(raw || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = text.split('\n');
  const nonEmpty: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (trim(lines[i]) !== '') nonEmpty.push(lines[i]);
  }
  if (nonEmpty.length === 0) return {headers: [], rows: []};

  const hdrCells = splitCSVLine(nonEmpty[0]);
  const headers: string[] = [];
  for (let h = 0; h < hdrCells.length; h++) headers.push(normalizeKey(hdrCells[h]));

  const rows: Record<string, string>[] = [];
  for (let r = 1; r < nonEmpty.length; r++) {
    const c = splitCSVLine(nonEmpty[r]);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) row[headers[j]] = trim(c[j] || '');
    row.__line = String(r + 1);
    rows.push(row);
  }
  return {headers, rows};
}

/**
 * Pick a value from a row using field aliases.
 * Ported from core/csv-parser.js pickCsvValue.
 */
export function pickCsvValue(row: Record<string, string> | undefined | null, field: string): string {
  if (!row) return '';
  const aliases = CSV_FIELD_ALIASES[field] || [field];
  for (let i = 0; i < aliases.length; i++) {
    const k = normalizeKey(aliases[i]);
    if (row[k] !== undefined && row[k] !== null) {
      const v = trim(row[k]);
      if (v !== '') return v;
    }
  }
  return '';
}

/**
 * Detect which CSV headers map to known fields.
 * Ported from core/csv-parser.js detectCsvMapping.
 */
export function detectCsvMapping(headers: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const field in CSV_FIELD_ALIASES) {
    if (!CSV_FIELD_ALIASES.hasOwnProperty(field)) continue;
    out[field] = '';
    const aliases = CSV_FIELD_ALIASES[field];
    let found = false;
    for (let i = 0; i < aliases.length && !found; i++) {
      const wanted = normalizeKey(aliases[i]);
      for (let j = 0; j < headers.length; j++) {
        if (headers[j] === wanted) {
          out[field] = headers[j];
          found = true;
          break;
        }
      }
    }
  }
  return out;
}

/**
 * Parse a timecode string (HH:MM:SS:FF or plain seconds) into seconds.
 * Ported from core/csv-parser.js parseTimecodeToSeconds.
 */
export function parseTimecodeToSeconds(raw: string, fps: number = 25): number | null {
  const s = trim(raw || '');
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s);
  const m = s.match(/^(\d{1,2}):(\d{2}):(\d{2}):(\d{2})$/);
  if (!m) return null;
  const hh = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const ss = parseInt(m[3], 10);
  const ff = parseInt(m[4], 10);
  if (isNaN(hh) || isNaN(mm) || isNaN(ss) || isNaN(ff)) return null;
  const effectiveFps = fps > 0 ? fps : 25;
  return hh * 3600 + mm * 60 + ss + ff / effectiveFps;
}

/**
 * Flexible time parsing — tries timecode first, then comma-decimal fallback.
 * Ported from core/csv-parser.js parseCsvTimeFlexible.
 */
export function parseCsvTimeFlexible(raw: string, fps: number = 25): number | null {
  const s = trim(raw || '');
  if (!s) return null;
  const v = parseTimecodeToSeconds(s, fps);
  if (v !== null && !isNaN(v)) return v;
  const normalized = s.replace(',', '.');
  if (/^\d+(\.\d+)?$/.test(normalized)) return parseFloat(normalized);
  return null;
}

// --- High-level converters ---

/**
 * Parse bullets from a delimited string (pipe or semicolon separated).
 */
function parseBullets(raw: string): BulletEntry[] {
  if (!raw) return [];
  const parts = raw.includes('|') ? raw.split('|') : raw.split(';');
  return parts
    .map((p) => trim(p))
    .filter((p) => p !== '')
    .map((text) => ({text}));
}

/**
 * Parse images from a delimited string and resolve via MediaDB.
 */
function parseImages(raw: string, imageKey: string, mediaDB?: MediaDB): ImageEntry[] {
  const entries: ImageEntry[] = [];

  if (imageKey) {
    const keys = imageKey.includes('|') ? imageKey.split('|') : imageKey.split(';');
    for (const k of keys) {
      const key = trim(k);
      if (!key) continue;
      const resolvedUrl = mediaDB && mediaDB[key] ? mediaDB[key] : '';
      entries.push({key, resolvedUrl});
    }
  }

  if (raw) {
    const paths = raw.includes('|') ? raw.split('|') : raw.split(';');
    for (const p of paths) {
      const path = trim(p);
      if (!path) continue;
      entries.push({path, resolvedUrl: path});
    }
  }

  return entries;
}

/**
 * Convert parsed CSV data into a TimelineData object.
 * Maps CSV rows to TimelineEntry objects using the same field aliases as the AE plugin.
 */
export function csvToTimeline(csvText: string, mediaDB?: MediaDB, fps: number = 25): TimelineData {
  const {rows} = parseCSVRaw(csvText);

  let maxEnd = 0;
  const entries: TimelineEntry[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    // Resolve start time
    const tcRaw = pickCsvValue(row, 'timecode') || pickCsvValue(row, 'time_in');
    const startTime = parseCsvTimeFlexible(tcRaw, fps);
    if (startTime === null) continue; // skip rows without valid timecode

    // Resolve duration
    const durRaw = pickCsvValue(row, 'dur');
    const duration = durRaw ? toNum(durRaw, 5) : 5;

    // Resolve end time for total duration calculation
    const endTime = startTime + duration;
    if (endTime > maxEnd) maxEnd = endTime;

    // Texts: collect text, plus any text_1, text_2, ... columns
    const texts: string[] = [];
    const mainText = pickCsvValue(row, 'text');
    if (mainText) texts.push(mainText);

    // Look for additional numbered text columns
    for (let t = 1; t <= 10; t++) {
      const key = normalizeKey(`text_${t}`);
      if (row[key] && trim(row[key])) {
        texts.push(trim(row[key]));
      }
    }

    // Preset
    const presetName = pickCsvValue(row, 'preset') || pickCsvValue(row, 'template') || 'Texte';

    // Bullets
    const bulletsRaw = pickCsvValue(row, 'bullets');
    const bullets = parseBullets(bulletsRaw);

    // Images
    const imageRaw = pickCsvValue(row, 'image');
    const imageKeyRaw = pickCsvValue(row, 'image_key');
    const images = parseImages(imageRaw, imageKeyRaw, mediaDB);

    // Animation overrides
    const fade = toNum(pickCsvValue(row, 'fade'), 0.35);
    const moveX = toNum(pickCsvValue(row, 'x'), 0);
    const moveY = toNum(pickCsvValue(row, 'y'), -100);
    const blur = toNum(pickCsvValue(row, 'blur'), 50);

    // Family: visual if images present, text otherwise
    const family = images.length > 0 ? 'visual' : 'text';

    const entry: TimelineEntry = {
      id: String(i + 1),
      presetName,
      presetId: normalizeKey(presetName) + '-' + (i + 1),
      startTime,
      duration,
      texts,
      bullets,
      images,
      family,
      animation: {fade, moveX, moveY, blur},
    };

    entries.push(entry);
  }

  return {
    fps,
    width: 1920,
    height: 1080,
    durationInSeconds: maxEnd > 0 ? Math.ceil(maxEnd) : 60,
    entries,
    mediaDB,
  };
}

/**
 * Parse a JSON timeline directly (for agent IA workflow).
 * Validates the structure and returns a TimelineData object.
 */
export function jsonToTimeline(json: string): TimelineData {
  const parsed = JSON.parse(json);

  // Validate required top-level fields
  const fps = toNum(parsed.fps, 25);
  const width = toNum(parsed.width, 1920);
  const height = toNum(parsed.height, 1080);
  const durationInSeconds = toNum(parsed.durationInSeconds, 60);

  const rawEntries: unknown[] = Array.isArray(parsed.entries) ? parsed.entries : [];

  const entries: TimelineEntry[] = rawEntries.map((raw: any, i: number) => {
    const bullets: BulletEntry[] = Array.isArray(raw.bullets)
      ? raw.bullets.map((b: any) => ({
          text: String(b.text || ''),
          inOffset: b.inOffset != null ? toNum(b.inOffset, 0) : undefined,
          outOffset: b.outOffset != null ? toNum(b.outOffset, 0) : undefined,
        }))
      : [];

    const images: ImageEntry[] = Array.isArray(raw.images)
      ? raw.images.map((img: any) => ({
          path: img.path || undefined,
          key: img.key || undefined,
          resolvedUrl: img.resolvedUrl || '',
        }))
      : [];

    return {
      id: raw.id || String(i + 1),
      presetName: raw.presetName || 'Texte',
      presetId: raw.presetId || normalizeKey(raw.presetName || 'texte') + '-' + (i + 1),
      startTime: toNum(raw.startTime, 0),
      duration: toNum(raw.duration, 5),
      texts: Array.isArray(raw.texts) ? raw.texts.map(String) : [],
      bullets,
      images,
      family: raw.family === 'visual' ? 'visual' : 'text',
      animation: raw.animation
        ? {
            fade: toNum(raw.animation.fade, 0.35),
            moveX: toNum(raw.animation.moveX, 0),
            moveY: toNum(raw.animation.moveY, -100),
            blur: toNum(raw.animation.blur, 50),
          }
        : undefined,
    };
  });

  return {
    fps,
    width,
    height,
    durationInSeconds,
    entries,
    mediaDB: parsed.mediaDB || undefined,
  };
}
