// core/csv-parser.js — CSV parsing and field mapping

import { trim, toNum, normalizeKey } from './utils.js';

export function splitCSVLine(line){
  var out = [];
  var cur = "";
  var inQ = false;
  var i = 0;
  while(i < line.length){
    var ch = line.charAt(i);
    if(ch === "\""){
      if(inQ && i + 1 < line.length && line.charAt(i + 1) === "\""){
        cur += "\"";
        i += 2;
        continue;
      }
      inQ = !inQ;
      i++;
      continue;
    }
    if(ch === "," && !inQ){
      out.push(cur);
      cur = "";
      i++;
      continue;
    }
    cur += ch;
    i++;
  }
  out.push(cur);
  return out;
}

export function parseCSVRaw(raw){
  var text = String(raw || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  var lines = text.split("\n");
  var nonEmpty = [];
  for(var i=0; i<lines.length; i++){
    if(trim(lines[i]) !== "") nonEmpty.push(lines[i]);
  }
  if(nonEmpty.length === 0) return { headers: [], rows: [] };
  var hdrCells = splitCSVLine(nonEmpty[0]);
  var headers = [];
  for(var h=0; h<hdrCells.length; h++) headers.push(normalizeKey(hdrCells[h]));
  var rows = [];
  for(var r=1; r<nonEmpty.length; r++){
    var c = splitCSVLine(nonEmpty[r]);
    var row = {};
    for(var j=0; j<headers.length; j++) row[headers[j]] = trim(c[j] || "");
    row.__line = r + 1;
    rows.push(row);
  }
  return { headers: headers, rows: rows };
}

export var CSV_FIELD_ALIASES = {
  timecode: ["timecode", "tc", "time", "start", "in"],
  time_in: ["time_in", "tc_in", "in", "start", "debut", "timecode_in"],
  time_out: ["time_out", "tc_out", "out", "end", "fin", "timecode_out"],
  template: ["template", "template_comp", "comp", "modele", "model_comp"],
  text: ["text", "texte", "title", "copy"],
  image: ["image", "image_path", "img", "photo", "media"],
  image_key: ["image_key", "media_key", "asset_key", "key_image"],
  preset: ["preset", "preset_name"],
  category: ["category", "categorie", "cat"],
  bullets: ["bullets", "bullet_points", "bulletpoint", "liste"],
  text_slots: ["text_slots", "texts", "nb_textes", "text_count"],
  image_slots: ["image_slots", "images", "nb_images", "image_count"],
  dur: ["dur", "duree", "duration"],
  fade: ["fade", "fondu"],
  x: ["x", "movex", "move_x", "offset_x"],
  y: ["y", "movey", "move_y", "offset_y"],
  spawn_anchor: ["spawn_anchor", "anchor", "position_anchor", "apparition_anchor"],
  spawn_x: ["spawn_x", "spawn_offset_x", "apparition_x"],
  spawn_y: ["spawn_y", "spawn_offset_y", "apparition_y"],
  blur: ["blur", "flou"],
  color: ["color", "couleur", "marker_color", "label"]
};

export function pickCsvValue(row, field){
  if(!row) return "";
  var aliases = CSV_FIELD_ALIASES[field] || [field];
  for(var i=0; i<aliases.length; i++){
    var k = normalizeKey(aliases[i]);
    if(row[k] !== undefined && row[k] !== null){
      var v = trim(row[k]);
      if(v !== "") return v;
    }
  }
  return "";
}

export function detectCsvMapping(headers){
  var out = {};
  var i, j;
  for(var field in CSV_FIELD_ALIASES){
    if(!CSV_FIELD_ALIASES.hasOwnProperty(field)) continue;
    out[field] = "";
    var aliases = CSV_FIELD_ALIASES[field];
    for(i=0; i<aliases.length; i++){
      var wanted = normalizeKey(aliases[i]);
      for(j=0; j<headers.length; j++){
        if(headers[j] === wanted){
          out[field] = headers[j];
          i = aliases.length;
          break;
        }
      }
    }
  }
  return out;
}

export function parseTimecodeToSeconds(raw, frameRate){
  var s = trim(raw || "");
  if(!s) return null;
  if(/^\d+(\.\d+)?$/.test(s)) return parseFloat(s);
  var m = s.match(/^(\d{1,2}):(\d{2}):(\d{2}):(\d{2})$/);
  if(!m) return null;
  var hh = parseInt(m[1], 10);
  var mm = parseInt(m[2], 10);
  var ss = parseInt(m[3], 10);
  var ff = parseInt(m[4], 10);
  if(isNaN(hh) || isNaN(mm) || isNaN(ss) || isNaN(ff)) return null;
  var fps = toNum(frameRate, 25);
  if(fps <= 0) fps = 25;
  return (hh * 3600) + (mm * 60) + ss + (ff / fps);
}

export function parseCsvTimeFlexible(raw, frameRate){
  var s = trim(raw || "");
  if(!s) return null;
  var v = parseTimecodeToSeconds(s, frameRate);
  if(v !== null && !isNaN(v)) return v;
  s = s.replace(",", ".");
  if(/^\d+(\.\d+)?$/.test(s)) return parseFloat(s);
  return null;
}

export function csvCell(v){
  var s = String(v === undefined || v === null ? "" : v);
  return "\"" + s.replace(/"/g, "\"\"") + "\"";
}

export function csvLine(cells){
  var out = [];
  for(var i=0; i<cells.length; i++) out.push(csvCell(cells[i]));
  return out.join(",");
}
