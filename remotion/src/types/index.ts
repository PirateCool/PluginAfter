// Types for Marker Builder 2 Remotion

export type PresetFamily = 'text' | 'visual';

export type LayoutMode = 'stack_anchor' | 'manual' | 'fullscreen';

export type SpawnAnchor =
  | 'top_left' | 'top_center' | 'top_right'
  | 'middle_left' | 'middle_center' | 'middle_right'
  | 'bottom_left' | 'bottom_center' | 'bottom_right';

export interface Preset {
  id: string;
  name: string;
  tags: string;
  description: string;
  favorite: boolean;
  modelComp: string;
  dur: number;
  fade: number;
  moveX: number;
  moveY: number;
  blur: number;
  spawnAnchor: SpawnAnchor;
  spawnOffsetX: number;
  spawnOffsetY: number;
  layoutMode: LayoutMode;
  family: PresetFamily;
  gridWUnits: number;
  gridHUnits: number;
  textSlots: number;
  imageSlots: number;
  inject: boolean;
  markerLabel: number;
}

export interface PresetCategory {
  name: string;
  presets: Preset[];
}

export interface PresetDB {
  categories: PresetCategory[];
  selectedCategory: number;
  selectedPresetId: string;
  autoColorIndex: number;
}

export interface TimelineEntry {
  id: string;
  presetName: string;
  presetId: string;
  /** Start time in seconds */
  startTime: number;
  /** Duration in seconds */
  duration: number;
  /** Texts to inject, indexed by slot */
  texts: string[];
  /** Bullet points with optional cue timings */
  bullets: BulletEntry[];
  /** Image paths or keys */
  images: ImageEntry[];
  /** Position override */
  position?: {
    x: number;
    y: number;
  };
  /** Animation overrides */
  animation?: {
    fade: number;
    moveX: number;
    moveY: number;
    blur: number;
  };
  /** Preset family */
  family: PresetFamily;
}

export interface BulletEntry {
  text: string;
  /** Offset from overlay start in seconds */
  inOffset?: number;
  /** Offset from overlay start in seconds */
  outOffset?: number;
}

export interface ImageEntry {
  /** Direct path or URL */
  path?: string;
  /** Key into MediaDB */
  key?: string;
  /** Resolved URL (after MediaDB lookup) */
  resolvedUrl?: string;
}

export interface MediaDB {
  [key: string]: string;
}

export interface TimelineData {
  /** Video FPS */
  fps: number;
  /** Video width */
  width: number;
  /** Video height */
  height: number;
  /** Duration in seconds */
  durationInSeconds: number;
  /** All overlay entries */
  entries: TimelineEntry[];
  /** Media database for image key resolution */
  mediaDB?: MediaDB;
}

/** Props passed to the root Remotion composition */
export interface OverlayRootProps {
  timeline: TimelineData;
}
