/**
 * CLI: Render a video from a transcript file.
 *
 * Usage:
 *   npx ts-node render-from-transcript.ts <transcript-file> [options]
 *
 * Examples:
 *   npx ts-node render-from-transcript.ts transcript.srt
 *   npx ts-node render-from-transcript.ts whisper.json --strategy coaching
 *   npx ts-node render-from-transcript.ts notes.txt --strategy sections --duration 120
 *   npx ts-node render-from-transcript.ts transcript.srt --out overlay.webm --codec vp8
 *
 * Options:
 *   --strategy    subtitles | sections | coaching (default: coaching)
 *   --duration    Video duration in seconds (auto-detected from transcript if not set)
 *   --fps         Frames per second (default: 25)
 *   --out         Output file path (default: out/video.mp4)
 *   --codec       Video codec: h264 | vp8 | vp9 (default: h264)
 *   --frames      Frame range to render, e.g. 0-150 (optional)
 */

import fs from 'fs';
import path from 'path';
import { transcriptToVideo } from './src/data/transcript-parser';
import { TimelineData } from './src/types';

// Parse CLI args
const args = process.argv.slice(2);
const inputFile = args.find(a => !a.startsWith('--'));

if (!inputFile) {
  console.log(`
Usage: npx ts-node render-from-transcript.ts <transcript-file> [options]

Formats supportés:
  .srt          Sous-titres SRT
  .json         Whisper / AssemblyAI JSON
  .txt          Texte horodaté (00:05 - Mon texte)
  .csv          CSV MB2 (utiliser csv-parser directement)

Options:
  --strategy    subtitles | sections | coaching (défaut: coaching)
  --duration    Durée vidéo en secondes
  --fps         Images par seconde (défaut: 25)
  --out         Fichier de sortie (défaut: out/video.mp4)
  --preview     Générer le JSON timeline sans rendre

Exemples:
  npx ts-node render-from-transcript.ts mon_transcript.srt
  npx ts-node render-from-transcript.ts whisper.json --strategy coaching --out overlay.mp4
  npx ts-node render-from-transcript.ts notes.txt --preview
`);
  process.exit(0);
}

function getArg(name: string, defaultValue?: string): string | undefined {
  const idx = args.indexOf(`--${name}`);
  if (idx >= 0 && idx + 1 < args.length) return args[idx + 1];
  return defaultValue;
}

const hasFlag = (name: string) => args.includes(`--${name}`);

// Read transcript
const transcriptPath = path.resolve(inputFile);
if (!fs.existsSync(transcriptPath)) {
  console.error(`Fichier introuvable: ${transcriptPath}`);
  process.exit(1);
}

const transcriptText = fs.readFileSync(transcriptPath, 'utf-8');
const strategy = (getArg('strategy', 'coaching') as 'subtitles' | 'sections' | 'coaching');
const fps = parseInt(getArg('fps', '25')!, 10);
const videoDuration = getArg('duration') ? parseFloat(getArg('duration')!) : undefined;
const outFile = getArg('out', 'out/video.mp4')!;
const isPreview = hasFlag('preview');

// Convert transcript to timeline
console.log(`Parsing: ${path.basename(transcriptPath)}`);
console.log(`Strategy: ${strategy}`);

const timeline: TimelineData = transcriptToVideo(transcriptText, {
  fps,
  videoDuration,
  strategy,
});

console.log(`Timeline: ${timeline.entries.length} overlay(s), ${timeline.durationInSeconds.toFixed(1)}s`);

// Preview mode: just output JSON
if (isPreview) {
  const jsonPath = outFile.replace(/\.[^.]+$/, '.json');
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(timeline, null, 2));
  console.log(`Timeline JSON exporté: ${jsonPath}`);
  process.exit(0);
}

// Render mode: write timeline then call remotion render
const timelinePath = path.join(__dirname, '.tmp-timeline.json');
fs.writeFileSync(timelinePath, JSON.stringify(timeline));

console.log(`Rendering ${timeline.durationInSeconds.toFixed(1)}s → ${outFile}`);
console.log(`Pour rendre, exécuter:`);
console.log(`  npx remotion render src/index.tsx OverlayComposition ${outFile} --props='${JSON.stringify({ timeline })}'`);
