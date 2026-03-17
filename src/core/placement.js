// placement.js — Spatial placement logic extracted from Marker Builder 2.jsx

import { trim, toNum, mb2Log, pad3 } from './utils.js';
import { loadGridLayoutConfig } from './settings.js';
import { getPresetFamily } from './presets.js';
import {
  TAG_MK, TAG_LAYER,
  MB2_STACK_ANCHOR_NAME, MB2_STACK_UNIT_PX, MB2_STACK_GAP_PX,
  MB2_VISUAL_COLS, MB2_VISUAL_COL_W_PX, MB2_VISUAL_BASE_OFFSET_X,
  GEN_FOLDER_NAME,
  activeComp, ensureStackAnchor, findCompByName, getOrCreateFolder,
  buildMarkerComment, parseMarkerComment, addMarker,
  ensureSlider, ensureBlur, setExpr,
  applyOutroExpressions, setLayerOutroDefaults,
  getAllMarkers, findStackAnchorLayer
} from './ae-bridge.js';

// ---------------------------------------------------------------------------
//  Runtime cache
// ---------------------------------------------------------------------------

export var placementRuntimeCache = null;

export function clearPlacementRuntimeCache(){
  placementRuntimeCache = null;
}

export function ensurePlacementRuntimeCache(comp){
  if(!comp) return null;
  if(placementRuntimeCache && placementRuntimeCache.comp === comp) return placementRuntimeCache;
  var cache = { comp: comp, nextIndexByPreset: {}, gridEntries: [], stackEntries: [] };
  for(var i=1; i<=comp.numLayers; i++){
    var ly = comp.layer(i);
    var nm = "";
    try{ nm = ly.name || ""; }catch(_eNm){ nm = ""; }
    var nameMatch = nm.match(/^AUTO - (.*) (\d{3})$/);
    if(nameMatch){
      var presetKey = nameMatch[1];
      var idx = parseInt(nameMatch[2], 10);
      if(!isNaN(idx)){
        cache.nextIndexByPreset[presetKey] = Math.max(cache.nextIndexByPreset[presetKey] || 0, idx);
      }
    }
    var cmt = "";
    try{ cmt = trim(ly.comment || ""); }catch(_eCmt){ cmt = ""; }
    if(cmt.indexOf(TAG_LAYER) !== 0) continue;
    var meta = parseLayerMetaComment(cmt);
    var mode = trim(meta.layout || "manual").toLowerCase();
    if(mode === "grid_left" || mode === "grid_legacy") cache.gridEntries.push({ layer: ly, meta: meta });
    if(mode === "stack_anchor") cache.stackEntries.push({ layer: ly, meta: meta });
  }
  placementRuntimeCache = cache;
  return cache;
}

export function registerPlacedLayerInRuntimeCache(comp, layer, presetName, layoutInfo){
  var cache = ensurePlacementRuntimeCache(comp);
  if(!cache || !layer) return;
  if(presetName){
    var m = (layer.name || "").match(/(\d{3})$/);
    var nextIdx = m ? parseInt(m[1], 10) : 0;
    cache.nextIndexByPreset[presetName] = Math.max(cache.nextIndexByPreset[presetName] || 0, nextIdx);
  }
  if(layoutInfo && trim(layoutInfo.mode || "").toLowerCase() === "grid_legacy"){
    cache.gridEntries.push({
      layer: layer,
      meta: {
        layout: "grid_legacy",
        gx: String(layoutInfo.gx),
        gy: String(layoutInfo.gy),
        gw: String(layoutInfo.gw),
        gh: String(layoutInfo.gh)
      }
    });
  }
  if(layoutInfo && trim(layoutInfo.mode || "").toLowerCase() === "stack_anchor"){
    cache.stackEntries.push({
      layer: layer,
      meta: {
        layout: "stack_anchor",
        zone: String(layoutInfo.zone || "text"),
        sx: String(layoutInfo.sx),
        sy: String(layoutInfo.sy),
        sw: String(layoutInfo.sw),
        sh: String(layoutInfo.sh)
      }
    });
  }
}

// ---------------------------------------------------------------------------
//  Index helpers
// ---------------------------------------------------------------------------

export function nextIndexForName(comp, presetName){
  var cache = placementRuntimeCache && placementRuntimeCache.comp === comp ? placementRuntimeCache : null;
  if(cache){
    cache.nextIndexByPreset[presetName] = (cache.nextIndexByPreset[presetName] || 0) + 1;
    return cache.nextIndexByPreset[presetName];
  }
  var max = 0;
  var re = new RegExp("^AUTO - " + presetName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + " (\\d{3})$");
  for(var i=1; i<=comp.numLayers; i++){
    var nm = comp.layer(i).name || "";
    var m = nm.match(re);
    if(m){
      var v = parseInt(m[1], 10);
      if(v > max) max = v;
    }
  }
  return max + 1;
}

// ---------------------------------------------------------------------------
//  Geometry helpers
// ---------------------------------------------------------------------------

export function parseLayerMetaComment(comment){
  var out = {};
  var s = trim(comment || "");
  if(!s) return out;
  var m;
  var re = /\b([a-zA-Z0-9_]+)=([^\s]+)/g;
  while((m = re.exec(s)) !== null) out[m[1]] = m[2];
  return out;
}

export function overlapsTime(aIn, aOut, bIn, bOut){
  var a1 = toNum(aIn, 0), a2 = toNum(aOut, 0), b1 = toNum(bIn, 0), b2 = toNum(bOut, 0);
  return (a1 < b2) && (b1 < a2);
}

export function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh){
  if(ax + aw <= bx) return false;
  if(bx + bw <= ax) return false;
  if(ay + ah <= by) return false;
  if(by + bh <= ay) return false;
  return true;
}

// ---------------------------------------------------------------------------
//  Grid configuration & occupied collection
// ---------------------------------------------------------------------------

export function getLeftGridConfig(comp){
  var w = comp ? comp.width : 1920;
  var h = comp ? comp.height : 1080;
  var cfg = loadGridLayoutConfig();
  var cols = cfg.cols;
  var rows = cfg.rows;
  // Zone overlay principale: cote droit (configurable via UI).
  var areaW = w * cfg.wPct;
  var areaH = h * cfg.hPct;
  var cellW = areaW / cols;
  var cellH = areaH / rows;
  var originX = w * cfg.xPct;
  var originY = h * cfg.yPct;
  return { cols: cols, rows: rows, cellW: cellW, cellH: cellH, originX: originX, originY: originY };
}

export function collectGridOccupied(comp, t, dur, cfg){
  var out = [];
  if(!comp) return out;
  var tIn = toNum(t, 0);
  var tOut = tIn + Math.max(0.001, toNum(dur, 0.001));
  var cache = placementRuntimeCache && placementRuntimeCache.comp === comp ? placementRuntimeCache : null;
  var entries = null;
  if(cache){
    entries = cache.gridEntries;
  }else{
    entries = [];
    for(var i=1; i<=comp.numLayers; i++){
      var lyRaw = comp.layer(i);
      var cmtRaw = "";
      try{ cmtRaw = trim(lyRaw.comment || ""); }catch(_eCRaw){ cmtRaw = ""; }
      if(cmtRaw.indexOf(TAG_LAYER) !== 0) continue;
      entries.push({ layer: lyRaw, meta: parseLayerMetaComment(cmtRaw) });
    }
  }
  for(var ei=0; ei<entries.length; ei++){
    var entry = entries[ei];
    var ly = entry.layer;
    if(!ly || !overlapsTime(ly.inPoint, ly.outPoint, tIn, tOut)) continue;
    var meta = entry.meta || {};
    var mode = trim(meta.layout || "manual").toLowerCase();
    if(mode !== "grid_left" && mode !== "grid_legacy") continue;
    var gx = parseInt(toNum(meta.gx, NaN), 10);
    var gy = parseInt(toNum(meta.gy, NaN), 10);
    var gw = parseInt(toNum(meta.gw, 1), 10);
    var gh = parseInt(toNum(meta.gh, 1), 10);
    if(isNaN(gx) || isNaN(gy)){
      try{
        var pos = ly.property("ADBE Transform Group").property("ADBE Position").value;
        gx = Math.max(0, Math.min(cfg.cols - 1, Math.round((toNum(pos[0], cfg.originX) - cfg.originX) / cfg.cellW)));
        gy = Math.max(0, Math.min(cfg.rows - 1, Math.round((toNum(pos[1], cfg.originY) - cfg.originY) / cfg.cellH)));
      }catch(_ePos){
        gx = 0; gy = 0;
      }
    }
    gw = Math.max(1, Math.min(cfg.cols, isNaN(gw) ? 1 : gw));
    gh = Math.max(1, Math.min(cfg.rows, isNaN(gh) ? 1 : gh));
    out.push({ x: gx, y: gy, w: gw, h: gh });
  }
  return out;
}

export function collectStackOccupied(comp, t, dur, anchorY, zone){
  var out = [];
  if(!comp) return out;
  var tIn = toNum(t, 0);
  var tOut = tIn + Math.max(0.001, toNum(dur, 0.001));
  var cache = placementRuntimeCache && placementRuntimeCache.comp === comp ? placementRuntimeCache : null;
  var entries = [];
  if(cache){
    entries = cache.stackEntries;
  }else{
    for(var i=1; i<=comp.numLayers; i++){
      var lyRaw = comp.layer(i);
      var cmtRaw = "";
      try{ cmtRaw = trim(lyRaw.comment || ""); }catch(_eCRaw){ cmtRaw = ""; }
      if(cmtRaw.indexOf(TAG_LAYER) !== 0) continue;
      entries.push({ layer: lyRaw, meta: parseLayerMetaComment(cmtRaw) });
    }
  }
  for(var ei=0; ei<entries.length; ei++){
    var entry = entries[ei];
    var ly = entry.layer;
    if(!ly || !overlapsTime(ly.inPoint, ly.outPoint, tIn, tOut)) continue;
    var meta = entry.meta || {};
    var mode = trim(meta.layout || "manual").toLowerCase();
    if(mode !== "stack_anchor") continue;
    var metaZone = trim(meta.zone || "text").toLowerCase();
    if(zone && metaZone !== trim(zone).toLowerCase()) continue;
    var sx = toNum(meta.sx, NaN);
    var sy = toNum(meta.sy, NaN);
    var sw = toNum(meta.sw, NaN);
    var sh = toNum(meta.sh, NaN);
    if(isNaN(sx) || isNaN(sy) || isNaN(sw) || isNaN(sh)){
      try{
        var pos = ly.property("ADBE Transform Group").property("ADBE Position").value;
        sx = Math.max(0, toNum(pos[0], 0));
        sy = Math.max(0, toNum(pos[1], anchorY) - anchorY);
        sw = MB2_VISUAL_COL_W_PX;
        sh = MB2_STACK_UNIT_PX;
      }catch(_ePos){
        sx = 0;
        sy = 0;
        sw = MB2_VISUAL_COL_W_PX;
        sh = MB2_STACK_UNIT_PX;
      }
    }
    out.push({ x: Math.max(0, sx), y: Math.max(0, sy), w: Math.max(MB2_STACK_GAP_PX, sw), h: Math.max(MB2_STACK_GAP_PX, sh), zone: metaZone });
  }
  out.sort(function(a,b){ return a.y - b.y; });
  return out;
}

// ---------------------------------------------------------------------------
//  Stack / visual sizing
// ---------------------------------------------------------------------------

export function getStackBlockHeightPx(preset){
  var units = Math.max(1, parseInt(toNum(preset ? preset.gridHUnits : 1, 1), 10));
  return (units * MB2_STACK_UNIT_PX) + MB2_STACK_GAP_PX;
}

export function estimateLayerStackSizePx(layer, preset){
  var fallbackH = getStackBlockHeightPx(preset);
  var fallbackW = Math.max(MB2_VISUAL_COL_W_PX, toNum((preset ? preset.gridWUnits : 1), 1) * MB2_VISUAL_COL_W_PX);
  var out = { w: fallbackW, h: fallbackH };
  if(!layer) return out;
  try{
    if(typeof layer.sourceRectAtTime === "function"){
      var t = Math.max(0, toNum(layer.inPoint, 0));
      var rect = layer.sourceRectAtTime(t, false);
      if(rect){
        var rw = Math.max(0, toNum(rect.width, 0));
        var rh = Math.max(0, toNum(rect.height, 0));
        if(rw > 8 && rw < 5000) out.w = Math.max(fallbackW, rw);
        if(rh > 8 && rh < 5000) out.h = Math.max(fallbackH, rh + MB2_STACK_GAP_PX);
      }
    }
  }catch(_eRect){}
  try{
    if(layer.source){
      var sw = toNum(layer.source.width, 0);
      var sh = toNum(layer.source.height, 0);
      if(sw > 8 && sw < 5000) out.w = Math.max(out.w, Math.min(sw, fallbackW * 3));
      if(sh > 8 && sh < 5000) out.h = Math.max(out.h, Math.min(sh, fallbackH * 3));
    }
  }catch(_eSrc){}
  return out;
}

// ---------------------------------------------------------------------------
//  Slot finders
// ---------------------------------------------------------------------------

export function findVisualInlineSlot(occupied, blockW, blockH){
  var cols = MB2_VISUAL_COLS;
  var colW = MB2_VISUAL_COL_W_PX;
  var colSpan = Math.max(1, Math.min(cols, Math.ceil(Math.max(1, blockW) / colW)));
  var y = 0;
  var guard = 0;
  while(guard < 500){
    for(var col=0; col<=cols-colSpan; col++){
      var x = col * colW;
      var ok = true;
      for(var i=0; i<occupied.length; i++){
        var o = occupied[i];
        if(rectsOverlap(x, y, colSpan * colW, blockH, o.x, o.y, o.w, o.h)){ ok = false; break; }
      }
      if(ok) return { x: x, y: y, w: colSpan * colW, h: blockH };
    }
    var nextY = y + blockH;
    for(var j=0; j<occupied.length; j++){
      if(occupied[j].y >= y) nextY = Math.max(nextY, occupied[j].y + occupied[j].h);
    }
    y = nextY;
    guard++;
  }
  return { x: 0, y: y, w: colSpan * colW, h: blockH };
}

export function findFreeGridSlot(occupied, cfg, wUnits, hUnits){
  var w = Math.max(1, Math.min(cfg.cols, parseInt(toNum(wUnits, 1), 10)));
  var h = Math.max(1, Math.min(cfg.rows, parseInt(toNum(hUnits, 1), 10)));
  for(var y=0; y<=cfg.rows - h; y++){
    for(var x=0; x<=cfg.cols - w; x++){
      var ok = true;
      for(var i=0; i<occupied.length; i++){
        var o = occupied[i];
        if(rectsOverlap(x, y, w, h, o.x, o.y, o.w, o.h)){ ok = false; break; }
      }
      if(ok) return { x: x, y: y, w: w, h: h, overflow: false };
    }
  }
  return { x: 0, y: Math.max(0, cfg.rows - h), w: w, h: h, overflow: true };
}

// ---------------------------------------------------------------------------
//  Layer anchor / offset helpers
// ---------------------------------------------------------------------------

export function getLayerVisualCenterDelta(layer){
  if(!layer) return [0, 0];
  try{
    var tr = layer.property("ADBE Transform Group");
    var anchor = tr ? tr.property("ADBE Anchor Point") : null;
    var anchorVal = anchor ? anchor.value : [0, 0];
    if(typeof layer.sourceRectAtTime !== "function") return [0, 0];
    var t = 0;
    try{ t = Math.max(0, toNum(layer.inPoint, 0)); }catch(_eT){ t = 0; }
    var rect = layer.sourceRectAtTime(t, false);
    if(!rect) return [0, 0];
    var cx = toNum(rect.left, 0) + (toNum(rect.width, 0) * 0.5);
    var cy = toNum(rect.top, 0) + (toNum(rect.height, 0) * 0.5);
    return [cx - toNum(anchorVal[0], 0), cy - toNum(anchorVal[1], 0)];
  }catch(_eRect){
    return [0, 0];
  }
}

export function getLayerAnchorPoint(layer){
  var out = [0, 0];
  if(!layer) return out;
  try{
    var tr = layer.property("ADBE Transform Group");
    var ap = tr ? tr.property("ADBE Anchor Point") : null;
    var v = ap ? ap.value : null;
    if(v && v.length >= 2){
      out[0] = toNum(v[0], 0);
      out[1] = toNum(v[1], 0);
    }
  }catch(_eAp){}
  return out;
}

export function getLayerTopLeftOffset(layer){
  var ap = getLayerAnchorPoint(layer);
  if(!layer) return ap;
  try{
    if(typeof layer.sourceRectAtTime === "function"){
      var t = 0;
      try{ t = Math.max(0, toNum(layer.inPoint, 0)); }catch(_eT0){ t = 0; }
      var rect = layer.sourceRectAtTime(t, false);
      if(rect){
        return [
          toNum(ap[0], 0) - toNum(rect.left, 0),
          toNum(ap[1], 0) - toNum(rect.top, 0)
        ];
      }
    }
  }catch(_eRectTopLeft){}
  return ap;
}

// ---------------------------------------------------------------------------
//  Spawn position
// ---------------------------------------------------------------------------

export function baseSpawnPosition(comp, anchor){
  var w = comp ? comp.width : 1920;
  var h = comp ? comp.height : 1080;
  var xL = w * 0.2, xC = w * 0.5, xR = w * 0.8;
  var yT = h * 0.2, yM = h * 0.5, yB = h * 0.8;
  switch(anchor){
    case "top_left": return [xL, yT];
    case "top_center": return [xC, yT];
    case "top_right": return [xR, yT];
    case "middle_left": return [xL, yM];
    case "middle_center": return [xC, yM];
    case "middle_right": return [xR, yM];
    case "bottom_left": return [xL, yB];
    case "bottom_center": return [xC, yB];
    case "bottom_right": return [xR, yB];
    default: return [xR, yM];
  }
}

export function applySpawnPosition(layer, comp, preset, atTime, duration){
  if(!layer || !comp || !preset) return;
  var tr = layer.property("ADBE Transform Group");
  if(!tr) return { mode: "none" };
  var pos = tr.property("ADBE Position");
  if(!pos) return { mode: "none" };
  var mode = trim(preset.layoutMode || "stack_anchor").toLowerCase();
  if(mode === "grid_left") mode = "stack_anchor";
  if(mode === "grid_legacy") mode = "stack_anchor";
  if(mode !== "stack_anchor" && mode !== "manual" && mode !== "fullscreen") mode = "stack_anchor";
  if(mode === "stack_anchor"){
    var anchorLayer = ensureStackAnchor(comp, true, false);
    var anchorPos = [comp.width * 0.7, comp.height * 0.15];
    try{ anchorPos = anchorLayer.property("ADBE Transform Group").property("ADBE Position").value; }catch(_eAnchorPos){}
    var family = getPresetFamily(preset);
    var zone = family === "visual" ? "visual" : "text";
    var size = estimateLayerStackSizePx(layer, preset);
    var sx = 0;
    var sy = 0;
    var sw = Math.max(MB2_VISUAL_COL_W_PX, size.w);
    var sh = Math.max(MB2_STACK_GAP_PX, size.h);
    var occStack = collectStackOccupied(comp, toNum(atTime, 0), toNum(duration, 6), toNum(anchorPos[1], 0), zone);
    if(zone === "visual"){
      var slot = findVisualInlineSlot(occStack, sw, sh);
      sx = MB2_VISUAL_BASE_OFFSET_X + slot.x;
      sy = slot.y;
      sw = slot.w;
      sh = slot.h;
    }else{
      for(var si=0; si<occStack.length; si++){
        sy = Math.max(sy, occStack[si].y + occStack[si].h);
      }
    }
    var topLeft = getLayerTopLeftOffset(layer);
    try{ layer.parent = anchorLayer; }catch(_eParent){}
    var xStack = toNum(topLeft[0], 0) + sx + toNum(preset.spawnOffsetX, 0);
    var yStack = toNum(topLeft[1], 0) + sy + toNum(preset.spawnOffsetY, 0);
    try{ pos.setValue([xStack, yStack]); }catch(_eStack){}
    return { mode: "stack_anchor", zone: zone, sx: sx, sy: sy, sw: sw, sh: sh, px: xStack, py: yStack };
  }
  try{ if(layer.parent) layer.parent = null; }catch(_eParentOff){}
  var anchor = trim(preset.spawnAnchor || "middle_right");
  if(mode === "fullscreen" && !anchor) anchor = "middle_center";
  var p = baseSpawnPosition(comp, anchor);
  p[0] += toNum(preset.spawnOffsetX, 0);
  p[1] += toNum(preset.spawnOffsetY, 0);
  try{ pos.setValue(p); }catch(_e){}
  return { mode: mode, gx: -1, gy: -1, gw: 0, gh: 0, overflow: false };
}

// ---------------------------------------------------------------------------
//  Main placement function
// ---------------------------------------------------------------------------

export function placePresetAtTime(comp, preset, t, outResult){
  var tpl = findCompByName(preset.modelComp);
  if(!tpl) return false;

  var dur = toNum(preset.dur, 6);
  if(dur <= 0) dur = 6;

  var root = getOrCreateFolder(GEN_FOLDER_NAME, null);
  var compFolder = getOrCreateFolder(comp.name, root);
  var presetFolder = getOrCreateFolder(preset.name, compFolder);

  var idx = nextIndexForName(comp, preset.name);
  var instName = "AUTO__" + preset.name + "__" + pad3(idx);
  var inst = tpl.duplicate();
  inst.name = instName;
  try{ inst.parentFolder = presetFolder; }catch(e){}

  var ly = comp.layers.add(inst);
  ly.startTime = t;
  ly.inPoint = t;
  ly.outPoint = t + dur;
  ly.name = "AUTO - " + preset.name + " " + pad3(idx);
  try{ ly.comment = TAG_LAYER + " presetId=" + preset.id; }catch(_e2){}

  var layoutInfo = applySpawnPosition(ly, comp, preset, t, dur);
  applyOutroExpressions(ly, preset);
  setLayerOutroDefaults(ly, preset);
  try{
    var cParts = [TAG_LAYER, "presetId=" + preset.id];
    if(layoutInfo){
      cParts.push("layout=" + layoutInfo.mode);
      cParts.push("gx=" + layoutInfo.gx);
      cParts.push("gy=" + layoutInfo.gy);
      cParts.push("gw=" + layoutInfo.gw);
      cParts.push("gh=" + layoutInfo.gh);
      if(layoutInfo.zone !== undefined) cParts.push("zone=" + layoutInfo.zone);
      if(layoutInfo.sx !== undefined) cParts.push("sx=" + Math.round(toNum(layoutInfo.sx, 0)));
      if(layoutInfo.sy !== undefined) cParts.push("sy=" + Math.round(toNum(layoutInfo.sy, 0)));
      if(layoutInfo.sw !== undefined) cParts.push("sw=" + Math.round(toNum(layoutInfo.sw, 0)));
      if(layoutInfo.sh !== undefined) cParts.push("sh=" + Math.round(toNum(layoutInfo.sh, 0)));
      if(layoutInfo.dx !== undefined) cParts.push("dx=" + Math.round(toNum(layoutInfo.dx, 0)));
      if(layoutInfo.dy !== undefined) cParts.push("dy=" + Math.round(toNum(layoutInfo.dy, 0)));
    }
    ly.comment = cParts.join(" ");
  }catch(_eComment){}
  registerPlacedLayerInRuntimeCache(comp, ly, preset.name, layoutInfo);
  if(outResult){
    outResult.layer = ly;
    outResult.instanceComp = inst;
    outResult.layoutInfo = layoutInfo;
  }
  return true;
}

// ---------------------------------------------------------------------------
//  High-level entry points
// ---------------------------------------------------------------------------

export function placePresetAtCTI(preset, setStatus, secureMode){
  var comp = activeComp();
  if(!comp){ alert("Ouvre une composition active."); return; }
  if(!preset.modelComp){ alert("Choisis une composition modele avant de poser."); return; }
  if(secureMode){
    var msg = "Poser '" + preset.name + "' au curseur temporel ?\n";
    msg += "Modele: " + (preset.modelComp || "non defini") + "\n";
    msg += "Duree: " + toNum(preset.dur, 6) + "s";
    if(!confirm(msg)) return;
  }

  app.beginUndoGroup("MB2 Place Preset");
  try{
    var ok = placePresetAtTime(comp, preset, comp.time);
    if(!ok) alert("Composition modele introuvable pour le preset : " + preset.name);
    else setStatus("Element pose : " + preset.name);
  }finally{
    app.endUndoGroup();
  }
}

export function applyAllPluginMarkers(db, setStatus, secureMode){
  var comp = activeComp();
  if(!comp){ alert("Ouvre une composition active."); return; }

  var markers = getAllMarkers(comp);
  if(!markers.length){ setStatus("Aucun marqueur trouve."); return; }

  var presetById = {};
  for(var ci=0; ci<db.categories.length; ci++){
    var ps = db.categories[ci].presets;
    for(var pi=0; pi<ps.length; pi++) presetById[ps[pi].id] = ps[pi];
  }

  var jobs = [];
  var delKeys = [];
  for(var i=0; i<markers.length; i++){
    var parsed = parseMarkerComment(markers[i].comment);
    if(!parsed) continue;
    var p = presetById[parsed.presetId];
    if(!p) continue;
    jobs.push({ t: markers[i].time, preset: p });
    delKeys.push(markers[i].keyIndex);
  }

  if(!jobs.length){ setStatus("Aucun marqueur plugin exploitable."); return; }

  if(secureMode){
    var previewMsg = jobs.length + " element(s) AUTO vont etre crees.\n";
    previewMsg += delKeys.length + " marqueur(s) plugin seront supprimes ensuite.\nContinuer ?";
    if(!confirm(previewMsg)) return;
  }

  ensurePlacementRuntimeCache(comp);
  app.beginUndoGroup("MB2 Apply All");
  try{
    var created = 0;
    for(var j=0; j<jobs.length; j++){
      if(placePresetAtTime(comp, jobs[j].preset, jobs[j].t)) created++;
    }

    delKeys.sort(function(a,b){ return b-a; });
    var mp = comp.markerProperty;
    for(var d=0; d<delKeys.length; d++){
      if(d > 0 && delKeys[d] === delKeys[d-1]) continue;
      try{ mp.removeKey(delKeys[d]); }catch(_e){}
    }

    setStatus("Application terminee. Elements crees : " + created);
  }finally{
    app.endUndoGroup();
    clearPlacementRuntimeCache();
  }
}
