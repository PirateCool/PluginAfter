// core/settings.js — AE settings persistence and grid config

import { trim, toNum, clamp01, clampInt, mb2Log } from './utils.js';

export var PREF_SEC = "MarkerBuilder2";
export var KEY_DB = "dbJSON";
export var KEY_MEDIA_DB = "mediaDBJSON";
export var KEY_GRID_X_PCT = "gridXPercent";
export var KEY_GRID_Y_PCT = "gridYPercent";
export var KEY_GRID_W_PCT = "gridWPercent";
export var KEY_GRID_H_PCT = "gridHPercent";
export var KEY_GRID_COLS = "gridCols";
export var KEY_GRID_ROWS = "gridRows";
export var KEY_UI_COMPACT = "uiCompactMode";

export function haveSetting(sec, key){
  try{ return app.settings.haveSetting(sec, key); }catch(e){ return false; }
}

export function getSetting(sec, key, def){
  try{ return haveSetting(sec, key) ? app.settings.getSetting(sec, key) : def; }catch(e){ return def; }
}

export function saveSetting(sec, key, val){
  try{ app.settings.saveSetting(sec, key, String(val)); }catch(e){ mb2Log("warn", "saveSetting failed: " + sec + "/" + key + " - " + e); }
}

export function defaultGridLayoutConfig(){
  return {
    xPct: 0.50,
    yPct: 0.09,
    wPct: 0.43,
    hPct: 0.82,
    cols: 6,
    rows: 8
  };
}

export function sanitizeGridLayoutConfig(cfg){
  var d = defaultGridLayoutConfig();
  var out = cfg || {};
  out.xPct = clamp01(toNum(out.xPct, d.xPct));
  out.yPct = clamp01(toNum(out.yPct, d.yPct));
  out.wPct = clamp01(toNum(out.wPct, d.wPct));
  out.hPct = clamp01(toNum(out.hPct, d.hPct));
  out.cols = clampInt(out.cols, 2, 24, d.cols);
  out.rows = clampInt(out.rows, 2, 24, d.rows);
  if(out.xPct + out.wPct > 1) out.wPct = Math.max(0.05, 1 - out.xPct);
  if(out.yPct + out.hPct > 1) out.hPct = Math.max(0.05, 1 - out.yPct);
  return out;
}

export function loadGridLayoutConfig(){
  var d = defaultGridLayoutConfig();
  var cfg = {
    xPct: toNum(getSetting(PREF_SEC, KEY_GRID_X_PCT, String(d.xPct)), d.xPct),
    yPct: toNum(getSetting(PREF_SEC, KEY_GRID_Y_PCT, String(d.yPct)), d.yPct),
    wPct: toNum(getSetting(PREF_SEC, KEY_GRID_W_PCT, String(d.wPct)), d.wPct),
    hPct: toNum(getSetting(PREF_SEC, KEY_GRID_H_PCT, String(d.hPct)), d.hPct),
    cols: parseInt(getSetting(PREF_SEC, KEY_GRID_COLS, String(d.cols)), 10),
    rows: parseInt(getSetting(PREF_SEC, KEY_GRID_ROWS, String(d.rows)), 10)
  };
  return sanitizeGridLayoutConfig(cfg);
}

export function saveGridLayoutConfig(cfg){
  var c = sanitizeGridLayoutConfig(cfg);
  saveSetting(PREF_SEC, KEY_GRID_X_PCT, String(c.xPct));
  saveSetting(PREF_SEC, KEY_GRID_Y_PCT, String(c.yPct));
  saveSetting(PREF_SEC, KEY_GRID_W_PCT, String(c.wPct));
  saveSetting(PREF_SEC, KEY_GRID_H_PCT, String(c.hPct));
  saveSetting(PREF_SEC, KEY_GRID_COLS, String(c.cols));
  saveSetting(PREF_SEC, KEY_GRID_ROWS, String(c.rows));
}
