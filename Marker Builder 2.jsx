(function(thisObj){
  var PREF_SEC = "MarkerBuilder2";
  var KEY_DB = "dbJSON";
  var KEY_MEDIA_DB = "mediaDBJSON";
  var KEY_GRID_X_PCT = "gridXPercent";
  var KEY_GRID_Y_PCT = "gridYPercent";
  var KEY_GRID_W_PCT = "gridWPercent";
  var KEY_GRID_H_PCT = "gridHPercent";
  var KEY_GRID_COLS = "gridCols";
  var KEY_GRID_ROWS = "gridRows";
  var KEY_UI_COMPACT = "uiCompactMode";

  var GEN_FOLDER_NAME = "_AUTO_FROM_MARKERS_2";
  var TAG_MK = "[MB2]";
  var TAG_LAYER = "[MB2_LAYER]";
  var TAG_GRID_GUIDE = "[MB2_GRID_GUIDE]";
  var MB2_STACK_ANCHOR_NAME = "MB2_STACK_ANCHOR";
  var MB2_STACK_UNIT_PX = 120;
  var MB2_STACK_GAP_PX = 24;
  var MB2_VISUAL_COLS = 3;
  var MB2_VISUAL_COL_W_PX = 190;
  var MB2_VISUAL_BASE_OFFSET_X = 320;

  var STARTUP_LOCK_KEY = "__MB2_STARTUP_LOCK__";

  function trim(s){ return (s || "").replace(/^\s+|\s+$/g, ""); }
  function toNum(v, def){ var n = parseFloat(v); return isNaN(n) ? def : n; }
  function escStr(s){
    return String(s)
      .replace(/\\/g, "\\\\")
      .replace(/"/g, "\\\"")
      .replace(/\r/g, "\\r")
      .replace(/\n/g, "\\n")
      .replace(/\t/g, "\\t");
  }
  function stringifyJSON(v){
    if(v === null || v === undefined) return "null";
    var t = typeof v;
    if(t === "number") return isFinite(v) ? String(v) : "null";
    if(t === "boolean") return v ? "true" : "false";
    if(t === "string") return "\"" + escStr(v) + "\"";
    if(v instanceof Array){
      var a = [];
      for(var i=0; i<v.length; i++) a.push(stringifyJSON(v[i]));
      return "[" + a.join(",") + "]";
    }
    if(t === "object"){
      var p = [];
      for(var k in v){
        if(!v.hasOwnProperty(k)) continue;
        if(typeof v[k] === "function") continue;
        p.push("\"" + escStr(k) + "\":" + stringifyJSON(v[k]));
      }
      return "{" + p.join(",") + "}";
    }
    return "null";
  }
  function parseJSON(s){
    return eval("(" + s + ")");
  }
  function normalizeKey(s){
    return trim(String(s || "")).toLowerCase().replace(/\s+/g, "_");
  }
  function splitCSVLine(line){
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
  function parseCSVRaw(raw){
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
  var CSV_FIELD_ALIASES = {
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
  function pickCsvValue(row, field){
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
  function detectCsvMapping(headers){
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
  function parseTimecodeToSeconds(raw, frameRate){
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
  function parseCsvTimeFlexible(raw, frameRate){
    var s = trim(raw || "");
    if(!s) return null;
    var v = parseTimecodeToSeconds(s, frameRate);
    if(v !== null && !isNaN(v)) return v;
    s = s.replace(",", ".");
    if(/^\d+(\.\d+)?$/.test(s)) return parseFloat(s);
    return null;
  }

  function haveSetting(sec, key){
    try{ return app.settings.haveSetting(sec, key); }catch(e){ return false; }
  }

  function getSetting(sec, key, def){
    try{ return haveSetting(sec, key) ? app.settings.getSetting(sec, key) : def; }catch(e){ return def; }
  }

  function saveSetting(sec, key, val){
    try{ app.settings.saveSetting(sec, key, String(val)); }catch(e){}
  }
  function clamp01(v){
    var n = toNum(v, 0);
    if(n < 0) n = 0;
    if(n > 1) n = 1;
    return n;
  }
  function clampInt(v, minV, maxV, defV){
    var n = parseInt(toNum(v, defV), 10);
    if(isNaN(n)) n = defV;
    if(n < minV) n = minV;
    if(n > maxV) n = maxV;
    return n;
  }
  function defaultGridLayoutConfig(){
    return {
      xPct: 0.50,
      yPct: 0.09,
      wPct: 0.43,
      hPct: 0.82,
      cols: 6,
      rows: 8
    };
  }
  function sanitizeGridLayoutConfig(cfg){
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
  function loadGridLayoutConfig(){
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
  function saveGridLayoutConfig(cfg){
    var c = sanitizeGridLayoutConfig(cfg);
    saveSetting(PREF_SEC, KEY_GRID_X_PCT, String(c.xPct));
    saveSetting(PREF_SEC, KEY_GRID_Y_PCT, String(c.yPct));
    saveSetting(PREF_SEC, KEY_GRID_W_PCT, String(c.wPct));
    saveSetting(PREF_SEC, KEY_GRID_H_PCT, String(c.hPct));
    saveSetting(PREF_SEC, KEY_GRID_COLS, String(c.cols));
    saveSetting(PREF_SEC, KEY_GRID_ROWS, String(c.rows));
  }

  function activeComp(){
    var it = app.project ? app.project.activeItem : null;
    return (it instanceof CompItem) ? it : null;
  }
  function clearLayerSelection(comp){
    if(!comp) return;
    for(var i=1; i<=comp.numLayers; i++){
      try{ comp.layer(i).selected = false; }catch(_eSel){}
    }
  }
  function findStackAnchorLayer(comp){
    if(!comp) return null;
    for(var i=1; i<=comp.numLayers; i++){
      var ly = comp.layer(i);
      if(!ly) continue;
      try{
        if(ly.nullLayer && trim(ly.name || "") === MB2_STACK_ANCHOR_NAME) return ly;
      }catch(_eNull){}
      var c = "";
      try{ c = trim(ly.comment || ""); }catch(_eC){}
      if(c.indexOf(TAG_LAYER) === 0 && c.indexOf(" stackAnchor=1") >= 0) return ly;
    }
    return null;
  }
  function ensureStackAnchor(comp, createIfMissing, selectIt){
    if(!comp) return null;
    var anchor = findStackAnchorLayer(comp);
    if(!anchor && createIfMissing){
      anchor = comp.layers.addNull();
      anchor.name = MB2_STACK_ANCHOR_NAME;
      anchor.label = 13;
      anchor.shy = false;
      anchor.guideLayer = false;
      anchor.locked = false;
      try{ anchor.comment = TAG_LAYER + " stackAnchor=1"; }catch(_eComment){}
      try{
        anchor.property("ADBE Transform Group").property("ADBE Position").setValue([2130, 634]);
      }catch(_ePos){}
    }
    if(anchor && selectIt){
      try{
        clearLayerSelection(comp);
        anchor.selected = true;
      }catch(_eSelect){}
    }
    return anchor;
  }

  function makeId(){
    var t = (new Date()).getTime().toString(16);
    var r = Math.floor(Math.random() * 0xFFFFFF).toString(16);
    return (t + "_" + r).toUpperCase();
  }

  var LABELS = [
    { i: 9, n: "Jaune" },
    { i: 2, n: "Rouge" },
    { i: 10, n: "Orange" },
    { i: 11, n: "Vert" },
    { i: 12, n: "Bleu" },
    { i: 13, n: "Violet" },
    { i: 14, n: "Brun" },
    { i: 15, n: "Gris" },
    { i: 16, n: "Noir" },
    { i: 0, n: "Sans couleur" }
  ];

  function nextAutoLabel(db){
    var seq = [9,2,10,11,12,13,14,15];
    var idx = db.autoColorIndex || 0;
    var val = seq[idx % seq.length];
    db.autoColorIndex = (idx + 1) % seq.length;
    return val;
  }
  function builtinPresetProfile(name){
    var n = trim(name || "").toLowerCase();
    var p = null;
    if(n === "titre") p = { description: "Titre court pour annoncer un point clé, une section ou une idée forte du coach.", textSlots: 1, imageSlots: 0, gridHUnits: 1, family: "text" };
    else if(n === "texte") p = { description: "Bloc texte simple pour expliciter une idée, une règle ou un conseil de coaching.", textSlots: 1, imageSlots: 0, gridHUnits: 1, family: "text" };
    else if(n === "titre + texte") p = { description: "Titre principal + sous-texte pour introduire un concept ou résumer une séquence pédagogique.", textSlots: 2, imageSlots: 0, gridHUnits: 2, family: "text" };
    else if(n === "bulletpoint") p = { description: "Liste progressive de points clés. Idéal pour étapes, règles, erreurs à éviter et plans d'action.", textSlots: 9, imageSlots: 0, gridHUnits: 3, family: "text" };
    else if(n === "bulletpoint 3") p = { description: "Version courte du bulletpoint pour 1 à 3 lignes. Idéal quand il faut garder un bloc compact.", textSlots: 3, imageSlots: 0, gridHUnits: 1, family: "text" };
    else if(n === "bulletpoint 5") p = { description: "Version intermédiaire du bulletpoint pour 4 à 5 lignes. Bon compromis lisibilité / densité.", textSlots: 5, imageSlots: 0, gridHUnits: 2, family: "text" };
    else if(n === "bulletpoint 9") p = { description: "Version longue du bulletpoint pour listes détaillées jusqu'à 9 lignes.", textSlots: 9, imageSlots: 0, gridHUnits: 3, family: "text" };
    else if(n === "pop up") p = { description: "Habillage visuel rapide avec une image contextuelle: champion, item, rune, spell, objectif ou élément de map.", textSlots: 0, imageSlots: 1, gridHUnits: 1, family: "visual" };
    else if(n === "pop icons") p = { description: "Ligne de plusieurs icônes contextuelles: champions, items, runes, spells ou objectifs montrés en parallèle.", textSlots: 0, imageSlots: 3, gridHUnits: 1, family: "visual" };
    else if(n === "conclusion") p = { description: "Écran ou message de clôture pour résumer l'idée finale et préparer la suite de la formation.", textSlots: 1, imageSlots: 0, gridHUnits: 1, family: "text" };
    else if(n === "champion focus") p = { description: "Focus visuel sur un champion avec nom et contexte court: matchup, combo, identité, rôle.", textSlots: 2, imageSlots: 1, gridHUnits: 2, family: "visual" };
    else if(n === "item focus") p = { description: "Mise en avant d'un item avec nom, timing d'achat ou raison pédagogique.", textSlots: 2, imageSlots: 1, gridHUnits: 2, family: "visual" };
    else if(n === "spell / rune") p = { description: "Visuel court pour un sort, une rune ou un setup utile au propos du coach.", textSlots: 2, imageSlots: 1, gridHUnits: 2, family: "visual" };
    else if(n === "objectif") p = { description: "Overlay pour dragon, Nashor, tour, vision ou tempo d'objectif.", textSlots: 2, imageSlots: 1, gridHUnits: 2, family: "visual" };
    else if(n === "erreur à éviter") p = { description: "Met en évidence une erreur fréquente et son correctif concret.", textSlots: 2, imageSlots: 0, gridHUnits: 2, family: "text" };
    else if(n === "astuce coach") p = { description: "Conseil court et actionnable à afficher rapidement pendant l'explication du coach.", textSlots: 2, imageSlots: 0, gridHUnits: 2, family: "text" };
    else if(n === "checklist") p = { description: "Checklist de vérification avant action: wave, vision, tempo, info jungle, timing objectif.", textSlots: 5, imageSlots: 0, gridHUnits: 2, family: "text" };
    return p || { description: "", textSlots: 1, imageSlots: 0, gridHUnits: 1, family: "text" };
  }

  function getPresetFamily(preset){
    var raw = trim((preset && preset.family) || "").toLowerCase();
    if(raw === "visual") return "visual";
    return "text";
  }

  function presetDefaults(name, db){
    var prof = builtinPresetProfile(name);
    return {
      id: makeId(),
      name: name || "preset",
      tags: "",
      description: prof.description || "",
      favorite: false,
      modelComp: "",
      dur: 6.0,
      fade: 0.35,
      moveX: 0,
      moveY: -100,
      blur: 50,
      spawnAnchor: "middle_right",
      spawnOffsetX: 0,
      spawnOffsetY: 0,
      layoutMode: "stack_anchor",
      family: trim(prof.family || "text"),
      gridWUnits: 1,
      gridHUnits: toNum(prof.gridHUnits, 1),
      textSlots: Math.max(0, parseInt(toNum(prof.textSlots, 1), 10)),
      imageSlots: Math.max(0, parseInt(toNum(prof.imageSlots, 0), 10)),
      inject: true,
      markerLabel: nextAutoLabel(db)
    };
  }

  function defaultDB(){
    var db = {
      categories: [
        { name: "Essentiels", presets: [] },
        { name: "Habillage", presets: [] }
      ],
      selectedCategory: 0,
      selectedPresetId: "",
      autoColorIndex: 0
    };
    db.categories[0].presets.push(presetDefaults("Titre", db));
    db.categories[0].presets.push(presetDefaults("Texte", db));
    db.categories[0].presets.push(presetDefaults("Titre + Texte", db));
    db.categories[0].presets.push(presetDefaults("Bulletpoint", db));
    db.categories[0].presets.push(presetDefaults("Bulletpoint 3", db));
    db.categories[0].presets.push(presetDefaults("Bulletpoint 5", db));
    db.categories[0].presets.push(presetDefaults("Bulletpoint 9", db));
    db.categories[0].presets.push(presetDefaults("Erreur à éviter", db));
    db.categories[0].presets.push(presetDefaults("Astuce coach", db));
    db.categories[0].presets.push(presetDefaults("Checklist", db));
    db.categories[1].presets.push(presetDefaults("Pop up", db));
    db.categories[1].presets.push(presetDefaults("Pop icons", db));
    db.categories[1].presets.push(presetDefaults("Champion focus", db));
    db.categories[1].presets.push(presetDefaults("Item focus", db));
    db.categories[1].presets.push(presetDefaults("Spell / Rune", db));
    db.categories[1].presets.push(presetDefaults("Objectif", db));
    db.categories[1].presets.push(presetDefaults("Conclusion", db));
    return db;
  }

  function sanitizePreset(p, db){
    if(!p) p = {};
    if(!p.id) p.id = makeId();
    p.name = trim(p.name || "preset");
    if(!p.name) p.name = "preset";
    p.tags = trim(p.tags || "");
    p.description = trim(p.description || "");
    if(!p.description){
      var prof = builtinPresetProfile(p.name || "");
      p.description = trim(prof.description || "");
    }
    p.family = trim(p.family || "");
    if(!p.family){
      var prof2 = builtinPresetProfile(p.name || "");
      p.family = trim(prof2.family || "text");
    }
    p.family = (trim(p.family).toLowerCase() === "visual") ? "visual" : "text";
    p.favorite = !!p.favorite;
    p.modelComp = trim(p.modelComp || "");
    p.dur = toNum(p.dur, 6.0);
    p.fade = toNum(p.fade, 0.35);
    p.moveX = toNum(p.moveX, 0);
    p.moveY = toNum(p.moveY, -100);
    p.blur = toNum(p.blur, 50);
    p.spawnAnchor = trim(p.spawnAnchor || "middle_right");
    if(!p.spawnAnchor) p.spawnAnchor = "middle_right";
    p.spawnOffsetX = toNum(p.spawnOffsetX, 0);
    p.spawnOffsetY = toNum(p.spawnOffsetY, 0);
    p.layoutMode = trim(p.layoutMode || "stack_anchor").toLowerCase();
    if(p.layoutMode === "grid_left" || p.layoutMode === "grid_legacy") p.layoutMode = "stack_anchor";
    if(p.layoutMode !== "stack_anchor" && p.layoutMode !== "manual" && p.layoutMode !== "fullscreen") p.layoutMode = "stack_anchor";
    p.gridWUnits = Math.max(1, Math.min(6, parseInt(toNum(p.gridWUnits, 1), 10)));
    p.gridHUnits = Math.max(1, Math.min(8, parseInt(toNum(p.gridHUnits, 1), 10)));
    p.textSlots = Math.max(0, parseInt(toNum(p.textSlots, 1), 10));
    p.imageSlots = Math.max(0, parseInt(toNum(p.imageSlots, 0), 10));
    p.inject = (p.inject !== false);
    if(p.markerLabel === undefined || p.markerLabel === null || isNaN(p.markerLabel)) p.markerLabel = nextAutoLabel(db);
    return p;
  }

  function sanitizeDB(db){
    if(!db || !(db.categories instanceof Array) || db.categories.length === 0) db = defaultDB();

    var outCats = [];
    for(var i=0; i<db.categories.length; i++){
      var c = db.categories[i] || {};
      var name = trim(c.name || ("Categorie " + (i + 1)));
      if(!name) name = "Categorie " + (i + 1);
      var presets = (c.presets instanceof Array) ? c.presets : [];
      for(var j=0; j<presets.length; j++) presets[j] = sanitizePreset(presets[j], db);
      outCats.push({ name: name, presets: presets });
    }

    if(outCats.length === 0) outCats.push({ name: "Defaut", presets: [presetDefaults("texte", db)] });
    function ensureCategoryByName(list, catName){
      for(var ci=0; ci<list.length; ci++){
        if(trim((list[ci] && list[ci].name) || "").toLowerCase() === trim(catName || "").toLowerCase()) return list[ci];
      }
      var created = { name: catName, presets: [] };
      list.push(created);
      return created;
    }
    function hasPresetNamed(catObj, presetName){
      if(!catObj || !(catObj.presets instanceof Array)) return false;
      var wanted = trim(presetName || "").toLowerCase();
      for(var pi=0; pi<catObj.presets.length; pi++){
        if(trim((catObj.presets[pi] && catObj.presets[pi].name) || "").toLowerCase() === wanted) return true;
      }
      return false;
    }
    var catEss = ensureCategoryByName(outCats, "Essentiels");
    var catHab = ensureCategoryByName(outCats, "Habillage");
    var builtinEss = ["Titre", "Texte", "Titre + Texte", "Bulletpoint", "Bulletpoint 3", "Bulletpoint 5", "Bulletpoint 9", "Erreur à éviter", "Astuce coach", "Checklist"];
    var builtinHab = ["Pop up", "Pop icons", "Champion focus", "Item focus", "Spell / Rune", "Objectif", "Conclusion"];
    for(var be=0; be<builtinEss.length; be++) if(!hasPresetNamed(catEss, builtinEss[be])) catEss.presets.push(presetDefaults(builtinEss[be], db));
    for(var bh=0; bh<builtinHab.length; bh++) if(!hasPresetNamed(catHab, builtinHab[bh])) catHab.presets.push(presetDefaults(builtinHab[bh], db));
    db.categories = outCats;

    if(db.autoColorIndex === undefined || isNaN(db.autoColorIndex)) db.autoColorIndex = 0;
    if(db.selectedCategory === undefined || db.selectedCategory === null || isNaN(db.selectedCategory)) db.selectedCategory = 0;
    db.selectedCategory = Math.max(0, Math.min(db.selectedCategory, db.categories.length - 1));

    if(db.selectedPresetId === undefined || db.selectedPresetId === null) db.selectedPresetId = "";
    db.selectedPresetId = String(db.selectedPresetId);

    return db;
  }

  function loadDB(){
    var raw = getSetting(PREF_SEC, KEY_DB, "");
    if(!raw){
      var fresh = defaultDB();
      saveDB(fresh);
      return fresh;
    }
    try{
      return sanitizeDB(parseJSON(raw));
    }catch(e){
      var fallback = defaultDB();
      saveDB(fallback);
      return fallback;
    }
  }

  function saveDB(db){
    saveSetting(PREF_SEC, KEY_DB, stringifyJSON(db));
  }
  function sanitizeMediaDB(raw){
    var out = {};
    if(!raw || typeof raw !== "object") return out;
    for(var k in raw){
      if(!raw.hasOwnProperty(k)) continue;
      var key = trim(k);
      var val = trim(raw[k] || "");
      if(!key || !val) continue;
      out[key] = val;
    }
    return out;
  }
  function loadMediaDB(){
    var raw = getSetting(PREF_SEC, KEY_MEDIA_DB, "");
    if(!raw) return {};
    try{ return sanitizeMediaDB(parseJSON(raw)); }catch(_e){ return {}; }
  }
  function saveMediaDB(db){
    saveSetting(PREF_SEC, KEY_MEDIA_DB, stringifyJSON(sanitizeMediaDB(db)));
  }

  function findItemByName(name, typeCtor){
    if(!app.project) return null;
    for(var i=1; i<=app.project.numItems; i++){
      var it = app.project.item(i);
      if(it && (it instanceof typeCtor) && it.name === name) return it;
    }
    return null;
  }

  function findCompByName(name){
    name = trim(name);
    if(!name || !app.project) return null;
    var wanted = name.toLowerCase();
    var fallback = null;
    for(var i=1; i<=app.project.numItems; i++){
      var it = app.project.item(i);
      if(it && (it instanceof CompItem) && it.name === name) return it;
      if(!fallback && it && (it instanceof CompItem) && trim(it.name || "").toLowerCase() === wanted) fallback = it;
    }
    return fallback;
  }

  var modelCompListCache = { project: null, numItems: -1, items: null };
  function invalidateModelCompListCache(){
    modelCompListCache.project = null;
    modelCompListCache.numItems = -1;
    modelCompListCache.items = null;
  }
  function listModelCompsFiltered(force){
    var out = [];
    if(!app.project) return out;
    if(!force){
      try{
        if(modelCompListCache.project && modelCompListCache.project === app.project && modelCompListCache.numItems === app.project.numItems && modelCompListCache.items){
          return modelCompListCache.items.slice(0);
        }
      }catch(_eCacheInvalid){
        invalidateModelCompListCache();
      }
    }

    var genFolder = findItemByName(GEN_FOLDER_NAME, FolderItem);
    for(var i=1; i<=app.project.numItems; i++){
      var it = app.project.item(i);
      if(!(it instanceof CompItem)) continue;

      var nm = it.name || "";
      if(nm.indexOf("AUTO__") === 0) continue;

      if(genFolder){
        try{
          var pf = it.parentFolder;
          var guard = 0;
          while(pf && guard < 256){
            if(pf === genFolder){ nm = null; break; }
            var nextPf = null;
            try{ nextPf = pf.parentFolder; }catch(_e){ nextPf = null; }
            if(nextPf === pf) break;
            pf = nextPf;
            guard++;
          }
          if(nm === null) continue;
        }catch(e){}
      }

      out.push(it.name);
    }

    out.sort();
    modelCompListCache.project = app.project;
    modelCompListCache.numItems = app.project.numItems;
    modelCompListCache.items = out.slice(0);
    return out;
  }

  function getOrCreateFolder(name, parent){
    var f = findItemByName(name, FolderItem);
    if(f){
      if(parent){
        try{ if(f.parentFolder !== parent) f.parentFolder = parent; }catch(_e){}
      }
      return f;
    }
    f = app.project.items.addFolder(name);
    if(parent){
      try{ f.parentFolder = parent; }catch(_e2){}
    }
    return f;
  }

  function buildMarkerComment(preset){
    return TAG_MK + " presetId=" + preset.id + " presetName=" + preset.name;
  }

  function parseMarkerComment(comment){
    comment = trim(comment || "");
    if(comment.indexOf(TAG_MK) !== 0) return null;
    var m = comment.match(/\bpresetId=([^\s]+)\b/);
    if(!m) return null;
    return { presetId: m[1] };
  }

  function addMarker(comp, preset){
    var mv = new MarkerValue(buildMarkerComment(preset));
    try{ mv.label = preset.markerLabel; }catch(e){}
    comp.markerProperty.setValueAtTime(comp.time, mv);
  }

  function ensureSlider(layer, name, value){
    var fx = layer.property("ADBE Effect Parade");
    if(!fx) return null;
    var i;
    for(i=1; i<=fx.numProperties; i++){
      if(fx.property(i).name === name) return fx.property(i);
    }
    var s = fx.addProperty("ADBE Slider Control");
    s.name = name;
    try{ s.property(1).setValue(value); }catch(e){}
    return s;
  }

  function ensureBlur(layer, value){
    var fx = layer.property("ADBE Effect Parade");
    if(!fx) return null;
    var i;
    for(i=1; i<=fx.numProperties; i++){
      if(fx.property(i).matchName === "ADBE Gaussian Blur 2") return fx.property(i);
    }
    var b = fx.addProperty("ADBE Gaussian Blur 2");
    b.name = "MB2 Gaussian Blur";
    try{ b.property(1).setValue(value); }catch(e){}
    return b;
  }

  function setExpr(prop, expr){
    try{
      prop.expression = expr;
      prop.expressionEnabled = true;
    }catch(e){}
  }

  function applyOutroExpressions(layer, preset){
    var fadeVal = Math.max(0, toNum(preset ? preset.fade : 0.35, 0.35));
    var moveXVal = toNum(preset ? preset.moveX : 0, 0);
    var moveYVal = toNum(preset ? preset.moveY : -100, -100);
    var blurVal = Math.max(0, toNum(preset ? preset.blur : 50, 50));
    var needsFade = fadeVal > 0;
    var needsMove = needsFade && (Math.abs(moveXVal) > 0.001 || Math.abs(moveYVal) > 0.001);
    var needsBlur = needsFade && blurVal > 0.001;
    if(!needsFade && !needsMove && !needsBlur) return;

    ensureSlider(layer, "MB2 Fade (s)", fadeVal);
    if(needsMove){
      ensureSlider(layer, "MB2 Move X", moveXVal);
      ensureSlider(layer, "MB2 Move Y", moveYVal);
    }
    if(needsBlur) ensureSlider(layer, "MB2 Blur", blurVal);

    var op = layer.property("ADBE Transform Group").property("ADBE Opacity");
    var pos = layer.property("ADBE Transform Group").property("ADBE Position");
    if(needsFade && op){
      setExpr(op, "var f=Math.max(0.001,effect('MB2 Fade (s)')(1));var t0=outPoint-f;(time<=t0)?100:ease(time,t0,outPoint,100,0);");
    }
    if(needsMove && pos){
      setExpr(pos, "var f=Math.max(0.001,effect('MB2 Fade (s)')(1));var dx=effect('MB2 Move X')(1);var dy=effect('MB2 Move Y')(1);var t0=outPoint-f;var p=clamp((time-t0)/f,0,1);value+[dx*p,dy*p];");
    }
    if(needsBlur){
      var blur = ensureBlur(layer, 0);
      if(blur){
        // Language-independent: no localized property names like Blurriness/Flou.
        setExpr(blur.property(1), "var f=Math.max(0.001,effect('MB2 Fade (s)')(1));var b=effect('MB2 Blur')(1);var t0=outPoint-f;(time<=t0)?0:ease(time,t0,outPoint,0,b);");
        try{ blur.property("Repeat Edge Pixels").setValue(true); }catch(_e){}
      }
    }
  }

  function setLayerOutroDefaults(layer, preset){
    var fx = layer.property("ADBE Effect Parade");
    if(!fx) return;
    var i;
    for(i=1; i<=fx.numProperties; i++){
      var e = fx.property(i);
      if(e.name === "MB2 Fade (s)") try{ e.property(1).setValue(preset.fade); }catch(_e1){}
      if(e.name === "MB2 Move X") try{ e.property(1).setValue(preset.moveX); }catch(_e2){}
      if(e.name === "MB2 Move Y") try{ e.property(1).setValue(preset.moveY); }catch(_e3){}
      if(e.name === "MB2 Blur") try{ e.property(1).setValue(preset.blur); }catch(_e4){}
      if(e.name === "MB2 Gaussian Blur") try{ e.property(1).setValue(0); }catch(_e5){}
    }
  }

  function pad3(n){ n = Math.max(0, parseInt(n,10) || 0); return (n<10?"00":(n<100?"0":"")) + n; }

  var placementRuntimeCache = null;
  function clearPlacementRuntimeCache(){
    placementRuntimeCache = null;
  }
  function ensurePlacementRuntimeCache(comp){
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
  function registerPlacedLayerInRuntimeCache(comp, layer, presetName, layoutInfo){
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
  function nextIndexForName(comp, presetName){
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

  function detectTemplateFieldSchema(templateName){
    var out = { text: 0, image: 0 };
    var tpl = findCompByName(templateName);
    if(!tpl) return out;
    var tagged = { text: 0, image: 0 };
    var hasTagged = false;
    function scanCompSchema(compItem, depth){
      var local = { text: 0, image: 0, taggedText: 0, taggedImage: 0, hasTagged: false };
      if(!compItem || depth > 2) return local;
      for(var i=1; i<=compItem.numLayers; i++){
        var ly = compItem.layer(i);
        var nm = trim(ly.name || "").toLowerCase();
        if(nm.indexOf("[mb2_text]") >= 0){ local.taggedText++; local.hasTagged = true; continue; }
        if(nm.indexOf("[mb2_image]") >= 0){ local.taggedImage++; local.hasTagged = true; continue; }
        var srcText = null;
        try{ srcText = ly.property("Source Text"); }catch(_e0){ srcText = null; }
        if(srcText){ local.text++; continue; }
        if(nm.indexOf("image") >= 0 || nm.indexOf("img") >= 0 || nm.indexOf("photo") >= 0 || nm.indexOf("visuel") >= 0 || nm.indexOf("logo") >= 0 || nm.indexOf("icon") >= 0 || nm.indexOf("media") >= 0 || nm.indexOf("placeholder") >= 0){
          local.image++;
          continue;
        }
        var src = null;
        try{ src = ly.source; }catch(_e1){ src = null; }
        if(src && (src instanceof FootageItem)){
          var isSolid = false;
          try{ isSolid = (src.mainSource instanceof SolidSource); }catch(_e2){ isSolid = false; }
          if(!isSolid){ local.image++; continue; }
        }
        if(src && (src instanceof CompItem)){
          var nested = scanCompSchema(src, depth + 1);
          local.text += nested.text;
          local.image += nested.image;
          local.taggedText += nested.taggedText;
          local.taggedImage += nested.taggedImage;
          local.hasTagged = local.hasTagged || nested.hasTagged;
        }
      }
      return local;
    }
    var scan = scanCompSchema(tpl, 0);
    out.text = scan.text;
    out.image = scan.image;
    tagged.text = scan.taggedText;
    tagged.image = scan.taggedImage;
    hasTagged = scan.hasTagged;
    if(hasTagged) return tagged;
    return out;
  }
  function auditTemplateContract(templateName){
    var tpl = findCompByName(templateName);
    var report = {
      template: templateName || "",
      exists: !!tpl,
      textCount: 0,
      imageCount: 0,
      taggedText: 0,
      taggedImage: 0,
      nestedCompCount: 0,
      maxDepth: 0,
      warnings: [],
      recommendations: [],
      score: 0,
      verdict: "mauvais"
    };
    if(!tpl){
      report.warnings.push("Template introuvable.");
      report.recommendations.push("Associe une composition modèle valide au preset.");
      return report;
    }
    function scan(compItem, depth){
      var local = { text: 0, image: 0, taggedText: 0, taggedImage: 0, nested: 0, maxDepth: depth };
      if(!compItem || depth > 4) return local;
      for(var i=1; i<=compItem.numLayers; i++){
        var ly = compItem.layer(i);
        var nm = trim(ly.name || "").toLowerCase();
        if(nm.indexOf("[mb2_text]") >= 0) local.taggedText++;
        if(nm.indexOf("[mb2_image]") >= 0) local.taggedImage++;
        var srcText = null;
        try{ srcText = ly.property("Source Text"); }catch(_e0){ srcText = null; }
        if(srcText) local.text++;
        if(nm.indexOf("image") >= 0 || nm.indexOf("img") >= 0 || nm.indexOf("photo") >= 0 || nm.indexOf("visuel") >= 0 || nm.indexOf("logo") >= 0 || nm.indexOf("icon") >= 0 || nm.indexOf("media") >= 0 || nm.indexOf("placeholder") >= 0) local.image++;
        var src = null;
        try{ src = ly.source; }catch(_e1){ src = null; }
        if(src && (src instanceof FootageItem)){
          var isSolid = false;
          try{ isSolid = (src.mainSource instanceof SolidSource); }catch(_e2){ isSolid = false; }
          if(!isSolid) local.image++;
        }
        if(src && (src instanceof CompItem)){
          local.nested++;
          var nested = scan(src, depth + 1);
          local.text += nested.text;
          local.image += nested.image;
          local.taggedText += nested.taggedText;
          local.taggedImage += nested.taggedImage;
          local.nested += nested.nested;
          if(nested.maxDepth > local.maxDepth) local.maxDepth = nested.maxDepth;
        }
      }
      return local;
    }
    var s = scan(tpl, 0);
    report.textCount = s.text;
    report.imageCount = s.image;
    report.taggedText = s.taggedText;
    report.taggedImage = s.taggedImage;
    report.nestedCompCount = s.nested;
    report.maxDepth = s.maxDepth;
    var score = 100;
    if(report.textCount <= 0 && report.imageCount <= 0){ report.warnings.push("Aucune cible texte/image détectée."); score -= 50; }
    if(report.maxDepth > 1){ report.warnings.push("Template imbriqué au-delà d'un niveau."); score -= 15; }
    if(report.taggedText <= 0 && report.textCount > 0){ report.warnings.push("Aucun tag [mb2_text] détecté."); score -= 10; }
    if(report.taggedImage <= 0 && report.imageCount > 0){ report.warnings.push("Aucun tag [mb2_image] détecté."); score -= 10; }
    if(report.maxDepth > 2){ report.warnings.push("Imbrication profonde: injection plus fragile."); score -= 20; }
    if(report.taggedText <= 0 && report.textCount > 0) report.recommendations.push("Tagge explicitement les couches texte avec [mb2_text].");
    if(report.taggedImage <= 0 && report.imageCount > 0) report.recommendations.push("Tagge explicitement les couches image avec [mb2_image].");
    if(report.maxDepth > 1) report.recommendations.push("Réduis l'imbrication ou garde les cibles MB2 dans la première précomp utile.");
    if(report.textCount <= 0 && report.imageCount <= 0) report.recommendations.push("Ajoute de vraies cibles texte ou image dans le template.");
    score = Math.max(0, Math.min(100, score));
    report.score = score;
    report.verdict = score >= 80 ? "OK" : (score >= 55 ? "FRAGILE" : "MAUVAIS");
    return report;
  }
  function buildTemplateAuditText(report){
    report = report || {};
    var lines = [];
    lines.push("Audit template MB2");
    lines.push("");
    lines.push("Template: " + (report.template || ""));
    lines.push("Existe: " + (report.exists ? "oui" : "non"));
    lines.push("Score: " + toNum(report.score, 0) + "/100");
    lines.push("Verdict: " + (report.verdict || "MAUVAIS"));
    lines.push("");
    lines.push("Détection");
    lines.push("- Textes: " + toNum(report.textCount, 0));
    lines.push("- Images: " + toNum(report.imageCount, 0));
    lines.push("- Tags [mb2_text]: " + toNum(report.taggedText, 0));
    lines.push("- Tags [mb2_image]: " + toNum(report.taggedImage, 0));
    lines.push("- Précomps imbriquées: " + toNum(report.nestedCompCount, 0));
    lines.push("- Profondeur max: " + toNum(report.maxDepth, 0));
    lines.push("");
    lines.push("Warnings");
    if(report.warnings && report.warnings.length){
      for(var i=0; i<report.warnings.length; i++) lines.push("- " + report.warnings[i]);
    }else lines.push("- Aucun");
    lines.push("");
    lines.push("Recommandations");
    if(report.recommendations && report.recommendations.length){
      for(var j=0; j<report.recommendations.length; j++) lines.push("- " + report.recommendations[j]);
    }else lines.push("- Aucune");
    return lines.join("\n");
  }

  function baseSpawnPosition(comp, anchor){
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

  function parseLayerMetaComment(comment){
    var out = {};
    var s = trim(comment || "");
    if(!s) return out;
    var m;
    var re = /\b([a-zA-Z0-9_]+)=([^\s]+)/g;
    while((m = re.exec(s)) !== null) out[m[1]] = m[2];
    return out;
  }
  function overlapsTime(aIn, aOut, bIn, bOut){
    var a1 = toNum(aIn, 0), a2 = toNum(aOut, 0), b1 = toNum(bIn, 0), b2 = toNum(bOut, 0);
    return (a1 < b2) && (b1 < a2);
  }
  function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh){
    if(ax + aw <= bx) return false;
    if(bx + bw <= ax) return false;
    if(ay + ah <= by) return false;
    if(by + bh <= ay) return false;
    return true;
  }
  function getLeftGridConfig(comp){
    var w = comp ? comp.width : 1920;
    var h = comp ? comp.height : 1080;
    var cfg = loadGridLayoutConfig();
    var cols = cfg.cols;
    var rows = cfg.rows;
    // Zone overlay principale: côté droit (configurable via UI).
    var areaW = w * cfg.wPct;
    var areaH = h * cfg.hPct;
    var cellW = areaW / cols;
    var cellH = areaH / rows;
    var originX = w * cfg.xPct;
    var originY = h * cfg.yPct;
    return { cols: cols, rows: rows, cellW: cellW, cellH: cellH, originX: originX, originY: originY };
  }
  function collectGridOccupied(comp, t, dur, cfg){
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
  function collectStackOccupied(comp, t, dur, anchorY, zone){
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
  function getStackBlockHeightPx(preset){
    var units = Math.max(1, parseInt(toNum(preset ? preset.gridHUnits : 1, 1), 10));
    return (units * MB2_STACK_UNIT_PX) + MB2_STACK_GAP_PX;
  }
  function estimateLayerStackSizePx(layer, preset){
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
  function findVisualInlineSlot(occupied, blockW, blockH){
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
  function findFreeGridSlot(occupied, cfg, wUnits, hUnits){
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
  function getLayerVisualCenterDelta(layer){
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
  function getLayerAnchorPoint(layer){
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
  function getLayerTopLeftOffset(layer){
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
  function applySpawnPosition(layer, comp, preset, atTime, duration){
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

  function placePresetAtTime(comp, preset, t, outResult){
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

  function getAllMarkers(comp){
    var mp = comp.markerProperty;
    var out = [];
    for(var k=1; k<=mp.numKeys; k++){
      var mv = mp.keyValue(k);
      out.push({ keyIndex: k, time: mp.keyTime(k), comment: mv ? (mv.comment || "") : "" });
    }
    out.sort(function(a,b){ return a.time - b.time; });
    return out;
  }

  function cleanPluginMarkers(setStatus, secureMode){
    var comp = activeComp();
    if(!comp){ alert("Ouvre une composition active."); return; }

    var mp = comp.markerProperty;
    var count = 0;
    for(var ci=1; ci<=mp.numKeys; ci++){
      var cc = trim((mp.keyValue(ci).comment || ""));
      if(cc.indexOf(TAG_MK) === 0) count++;
    }
    if(count === 0){ setStatus("ℹ️ Aucun marqueur plugin à supprimer."); return; }
    if(secureMode && !confirm("🧹 " + count + " marqueur(s) plugin vont être supprimés. Continuer ?")) return;

    app.beginUndoGroup("MB2 Clean Markers");
    try{
      var removed = 0;
      for(var i=mp.numKeys; i>=1; i--){
        var c = trim((mp.keyValue(i).comment || ""));
        if(c.indexOf(TAG_MK) === 0){
          mp.removeKey(i);
          removed++;
        }
      }
      setStatus("🧹 Marqueurs plugin supprimés : " + removed);
    }finally{
      app.endUndoGroup();
    }
  }

  function cleanupAutoLayers(setStatus, secureMode){
    var comp = activeComp();
    if(!comp){ alert("Ouvre une composition active."); return; }

    var autoCount = 0;
    for(var ai=1; ai<=comp.numLayers; ai++){
      var aLy = comp.layer(ai);
      var aC = "";
      try{ aC = trim(aLy.comment || ""); }catch(_ea){}
      if(aC.indexOf(TAG_LAYER) === 0) autoCount++;
    }
    if(autoCount === 0){ setStatus("ℹ️ Aucun calque AUTO à supprimer."); return; }
    if(secureMode && !confirm("🧽 " + autoCount + " calque(s) AUTO vont être supprimés. Continuer ?")) return;

    app.beginUndoGroup("MB2 Clean AUTO");
    try{
      var removed = 0;
      for(var i=comp.numLayers; i>=1; i--){
        var ly = comp.layer(i);
        var c = "";
        try{ c = trim(ly.comment || ""); }catch(_e){}
        if(c.indexOf(TAG_LAYER) === 0){
          try{ ly.remove(); removed++; }catch(e){}
        }
      }
      setStatus("🧽 Calques AUTO supprimés : " + removed);
    }finally{
      app.endUndoGroup();
    }
  }

  function placePresetAtCTI(preset, setStatus, secureMode){
    var comp = activeComp();
    if(!comp){ alert("Ouvre une composition active."); return; }
    if(!preset.modelComp){ alert("Choisis une composition modèle avant de poser."); return; }
    if(secureMode){
      var msg = "🎬 Poser '" + preset.name + "' au curseur temporel ?\n";
      msg += "Modèle: " + (preset.modelComp || "non défini") + "\n";
      msg += "Durée: " + toNum(preset.dur, 6) + "s";
      if(!confirm(msg)) return;
    }

    app.beginUndoGroup("MB2 Place Preset");
    try{
      var mp = comp.markerProperty;
      var markerComment = buildMarkerComment(preset);
      var tNow = comp.time;
      addMarker(comp, preset);
      var ok = placePresetAtTime(comp, preset, comp.time);
      // Keep timeline clean: remove only the marker we just created.
      try{
        for(var k=mp.numKeys; k>=1; k--){
          var kv = mp.keyValue(k);
          var c = kv ? (kv.comment || "") : "";
          var t = mp.keyTime(k);
          if(c === markerComment && Math.abs(t - tNow) < 0.0001){
            mp.removeKey(k);
            break;
          }
        }
      }catch(_eRm){}
      if(!ok) alert("❌ Composition modèle introuvable pour le preset : " + preset.name);
      else setStatus("✅ Élément posé : " + preset.name);
    }finally{
      app.endUndoGroup();
    }
  }

  function applyAllPluginMarkers(db, setStatus, secureMode){
    var comp = activeComp();
    if(!comp){ alert("Ouvre une composition active."); return; }

    var markers = getAllMarkers(comp);
    if(!markers.length){ setStatus("ℹ️ Aucun marqueur trouvé."); return; }

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

    if(!jobs.length){ setStatus("ℹ️ Aucun marqueur plugin exploitable."); return; }

    if(secureMode){
      var previewMsg = "⚡ " + jobs.length + " élément(s) AUTO vont être créés.\n";
      previewMsg += delKeys.length + " marqueur(s) plugin seront supprimés ensuite.\nContinuer ?";
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

      setStatus("⚡ Application terminée. Éléments créés : " + created);
    }finally{
      app.endUndoGroup();
      clearPlacementRuntimeCache();
    }
  }

    function buildUI(thisObj){
    var win = (thisObj instanceof Panel) ? thisObj : new Window("palette", "Marker Builder 2", undefined, { resizeable: true });
    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.margins = 8;
    win.spacing = 6;
    try{ win.minimumSize = [560, 360]; }catch(_eMinWin){}

    var db = sanitizeDB(loadDB());
    var mediaDB = loadMediaDB();
    function save(){ saveDB(db); }

    var secureMode = false;
    var favoritesOnly = getSetting(PREF_SEC, "favoritesOnly", "0") === "1";
    var csvDirectMode = false;
    var uiCompactMode = false;
    var gridLayoutWin = null;

    var currentSelectedPreset = null;
    var refreshPresetListCurrent = function(){};
    var history = [];

    function pushHistory(msg){
      history.push(msg);
      if(history.length > 10) history.shift();
    }

    var status = win.add("statictext", undefined, "Pret ✅");
    status.characters = 92;
    function setStatus(msg){
      status.text = msg || "Pret ✅";
      if(msg) pushHistory(msg);
    }
    var debugCat = false;
    var dbgLine = debugCat ? win.add("statictext", undefined, "DBG: init") : null;
    if(dbgLine){
      dbgLine.characters = 120;
      dbgLine.visible = true;
    }
    function dbg(msg){
      if(!debugCat || !dbgLine) return;
      dbgLine.text = "DBG: " + msg;
      try{ $.writeln("MB2 DBG: " + msg); }catch(_eDbg){}
    }

    var infoBar = win.add("group");
    infoBar.orientation = "row";
    var stComp = infoBar.add("statictext", undefined, "Comp: ❌");
    var stPreset = infoBar.add("statictext", undefined, "Preset: ❌");
    var stModel = infoBar.add("statictext", undefined, "Template: ❌");
    stComp.helpTip = "Etat de la composition active dans After Effects.";
    stPreset.helpTip = "Preset actuellement sélectionné.";
    stModel.helpTip = "Template associé au preset sélectionné.";
    stComp.characters = 24;
    stPreset.characters = 32;
    stModel.characters = 32;
    infoBar.visible = false;
    try{
      infoBar.minimumSize = [0, 0];
      infoBar.maximumSize = [0, 0];
    }catch(_eInfoBar){}

    function updateIndicators(){
      var comp = activeComp();
      stComp.text = comp ? ("Comp: ✅ " + comp.name) : "Comp: ❌ aucune";
      if(currentSelectedPreset){
        stPreset.text = "Preset: ✅ " + currentSelectedPreset.name;
        stModel.text = currentSelectedPreset.modelComp ? ("Template: ✅ " + currentSelectedPreset.modelComp) : "Template: ❌ non défini";
      }else{
        stPreset.text = "Preset: ❌ aucun";
        stModel.text = "Template: ❌ non défini";
      }
    }

    var actionPanel = win.add("panel", undefined, "Actions rapides");
    actionPanel.orientation = "column";
    actionPanel.alignChildren = ["fill", "top"];
    actionPanel.margins = 8;
    actionPanel.spacing = 6;
    try{ actionPanel.maximumSize = [10000, 210]; }catch(_eAP){}

    var prod = actionPanel.add("panel", undefined, "Production");
    prod.orientation = "row";
    prod.alignChildren = ["left", "center"];
    var btnPlaceMain = prod.add("button", undefined, "🎬 Poser maintenant");
    var btnApplyAll = prod.add("button", undefined, "⚡ Appliquer tout");
    var btnCleanMk = prod.add("button", undefined, "🧹 Marqueurs");
    var btnCleanAuto = prod.add("button", undefined, "🧽 AUTO");
    btnPlaceMain.helpTip = "Action principale: crée l'élément avec le preset sélectionné au curseur temporel.";
    btnApplyAll.helpTip = "Applique tous les marqueurs plugin détectés.";
    btnCleanMk.helpTip = "Supprime les marqueurs plugin de la composition active.";
    btnCleanAuto.helpTip = "Supprime les calques AUTO créés par ce plugin.";
    // Déplacé visuellement dans la zone preset (ligne locale).
    prod.visible = false;
    try{ prod.minimumSize = [0, 0]; prod.maximumSize = [0, 0]; }catch(_eProdHide){}

    var dataRow = actionPanel.add("panel", undefined, "Données");
    dataRow.orientation = "row";
    dataRow.alignChildren = ["left", "center"];
    var btnCsvQuick = dataRow.add("button", undefined, "📄 Import CSV");
    var btnMediaMain = dataRow.add("button", undefined, "🖼 Base médias");
    var btnExportMain = dataRow.add("button", undefined, "💾 Export");
    var btnImportMain = dataRow.add("button", undefined, "📥 Import");
    var btnSchemaMain = dataRow.add("button", undefined, "🧾 Blueprint MB");
    var btnAgentMain = dataRow.add("button", undefined, "🤖 Export Agent");
    btnCsvQuick.helpTip = "Importer un CSV de production.";
    btnMediaMain.helpTip = "Gérer la base interne des médias (image_key).";
    btnExportMain.helpTip = "Exporter la bibliothèque de presets (JSON).";
    btnImportMain.helpTip = "Importer une bibliothèque de presets (JSON).";
    btnSchemaMain.helpTip = "Exporter le Blueprint MB (CSV) des presets.";
    btnAgentMain.helpTip = "Exporter tout le contexte utile à l'agent IA.";

    var maintRow = actionPanel.add("panel", undefined, "Maintenance");
    maintRow.orientation = "column";
    maintRow.alignChildren = ["fill", "top"];
    maintRow.margins = 6;
    maintRow.spacing = 4;
    var maintTop = maintRow.add("group");
    maintTop.orientation = "row";
    maintTop.alignChildren = ["left", "center"];
    var maintBottom = maintRow.add("group");
    maintBottom.orientation = "row";
    maintBottom.alignChildren = ["left", "center"];
    var btnStackAnchor = maintTop.add("button", undefined, "⚓ Ancre pile");
    var btnRepairUI = maintBottom.add("button", undefined, "🛠 Réparer UI");
    var btnResetMain = maintBottom.add("button", undefined, "♻ Réinitialiser");
    var btnHistoryMain = maintBottom.add("button", undefined, "📜 Historique");
    btnStackAnchor.helpTip = "Crée ou sélectionne le null d'ancrage utilisé par la pile auto.";
    btnRepairUI.helpTip = "Force une reconstruction de l'interface en cas de bug d'affichage.";
    btnResetMain.helpTip = "Réinitialise la bibliothèque presets avec confirmation.";
    btnHistoryMain.helpTip = "Affiche les 10 dernières actions du plugin.";

    var catPanel = win.add("panel", undefined, "Bibliothèque presets");
    catPanel.orientation = "column";
    catPanel.alignChildren = ["fill", "top"];
    catPanel.margins = 6;
    catPanel.spacing = 3;
    try{ catPanel.maximumSize = [10000, 82]; }catch(_eCP){}

    var catBar = catPanel.add("group");
    catBar.orientation = "row";
    catBar.alignChildren = ["left", "center"];
    var catTitle = catBar.add("statictext", undefined, "Categories");
    var btnAddCat = catBar.add("button", undefined, "➕");
    var btnRenCat = catBar.add("button", undefined, "✏️");
    var btnDelCat = catBar.add("button", undefined, "🗑");
    var edSearch = catBar.add("edittext", undefined, "");
    edSearch.preferredSize = [180, 24];
    var chkFavOnly = catBar.add("checkbox", undefined, "⭐");
    chkFavOnly.value = favoritesOnly;
    catTitle.helpTip = "Gestion des catégories de presets.";
    btnAddCat.helpTip = "Créer une nouvelle catégorie.";
    btnRenCat.helpTip = "Renommer la catégorie active.";
    btnDelCat.helpTip = "Supprimer la catégorie active.";
    edSearch.helpTip = "Rechercher un preset par nom ou par tag.";
    chkFavOnly.helpTip = "Afficher uniquement les presets favoris.";

    var catTabs = catPanel.add("tabbedpanel");
    catTabs.alignChildren = ["fill", "top"];
    catTabs.minimumSize = [420, 24];
    catTabs.helpTip = "Un onglet correspond à une catégorie.";
    var contentHost = win.add("group");
    contentHost.orientation = "column";
    contentHost.alignChildren = ["fill", "top"];
    contentHost.minimumSize = [420, 220];
    var hint = win.add("statictext", undefined, "Aide: survole un contrôle pour une explication rapide.");
    hint.characters = 110;
    function applyGlobalCompactUI(){
      var compact = !!uiCompactMode;
      try{ actionPanel.maximumSize = compact ? [10000, 180] : [10000, 210]; }catch(_eApMax){}
      hint.visible = !compact;
      try{
        if(compact){
          hint.minimumSize = [0, 0];
          hint.maximumSize = [0, 0];
        }else{
          hint.minimumSize = [420, 18];
          hint.maximumSize = [10000, 10000];
        }
      }catch(_eHintSize){}
    }
    function updateGuide(_step){}
    function setHelp(msg){ hint.text = "Aide: " + (msg || "survole un contrôle pour une explication rapide."); }
    var relayoutLock = false;
    function safeRelayout(){
      if(relayoutLock) return;
      relayoutLock = true;
      try{
        if(contentHost && contentHost.layout) contentHost.layout.layout(true);
        if(win && win.layout) win.layout.layout(true);
      }catch(_eLayoutSafe){}
      relayoutLock = false;
    }
    function safeUI(label, fn){
      return function(){
        try{
          if(fn) return fn.apply(this, arguments);
        }catch(e){
          setStatus("❌ Erreur UI: " + label);
          alert("Erreur UI (" + label + "): " + e.toString() + (e.line ? (" (ligne " + e.line + ")") : ""));
        }
      };
    }
    function wrapHandler(ctrl, key, label){
      if(!ctrl) return;
      var orig = ctrl[key];
      if(typeof orig !== "function") return;
      ctrl[key] = safeUI(label, orig);
    }

    function resolveSelectedTab(tp){
      if(!tp) return null;
      if(tp.selection === null || tp.selection === undefined) return null;
      if(typeof tp.selection === "number"){
        var idx = tp.selection;
        if(idx >= 0 && idx < tp.children.length) return tp.children[idx];
        return null;
      }
      return tp.selection;
    }

    function getSelectedTabIndex(tp){
      var tab = resolveSelectedTab(tp);
      if(!tab) return -1;
      for(var i=0; i<tp.children.length; i++) if(tp.children[i] === tab) return i;
      return -1;
    }
    function selectTabByIndex(tp, idx){
      if(!tp || tp.children.length === 0) return false;
      var i = Math.max(0, Math.min(idx, tp.children.length - 1));
      var ok = false;
      try{ tp.selection = tp.children[i]; }catch(_e1){}
      ok = (getSelectedTabIndex(tp) === i);
      if(ok) return true;
      try{ tp.selection = i; }catch(_e2){}
      ok = (getSelectedTabIndex(tp) === i);
      dbg("selectTabByIndex req=" + idx + " use=" + i + " ok=" + ok + " children=" + tp.children.length);
      return ok;
    }

    var uiLocked = false;
    function rebuildCategoryTabs(){
      uiLocked = true;
      try{
        dbg("rebuildCategoryTabs start categories=" + db.categories.length + " selected=" + db.selectedCategory);
        while(catTabs.children.length > 0) catTabs.remove(catTabs.children[0]);
        for(var i=0; i<db.categories.length; i++) catTabs.add("tab", undefined, db.categories[i].name);
        db.selectedCategory = Math.max(0, Math.min(db.selectedCategory, db.categories.length - 1));
        var okSel = selectTabByIndex(catTabs, db.selectedCategory);
        dbg("rebuildCategoryTabs end selected=" + db.selectedCategory + " okSel=" + okSel + " tabs=" + catTabs.children.length);
      }finally{ uiLocked = false; }
    }

    function getCurrentCategory(){
      var idx = Math.max(0, Math.min(db.selectedCategory, db.categories.length - 1));
      return db.categories[idx];
    }

    function removeChildren(container){ while(container.children.length > 0) container.remove(container.children[0]); }

    function exportPresets(){
      var f = File.saveDialog("Exporter les presets JSON", "*.json");
      if(!f) return;
      try{
        var payload = { version:"MB2-PRESET-PACK-1", exportedAt:(new Date()).toUTCString(), categories: db.categories };
        f.encoding = "UTF-8";
        if(!f.open("w")) throw new Error("Ouverture ecriture impossible.");
        f.write(stringifyJSON(payload));
        f.close();
        setStatus("💾 Export termine.");
      }catch(e){ try{ f.close(); }catch(_e){} alert("Erreur export JSON: " + e.toString()); }
    }

    function importPresets(){
      if(secureMode && !confirm("📥 Importer un JSON va remplacer les categories actuelles. Continuer ?")) return;
      var f = File.openDialog("Importer un pack presets JSON", "*.json");
      if(!f) return;
      try{
        f.encoding = "UTF-8";
        if(!f.open("r")) throw new Error("Ouverture lecture impossible.");
        var raw = f.read();
        f.close();
        var data = parseJSON(raw);
        if(!data || !(data.categories instanceof Array)) throw new Error("Format JSON invalide.");
        db.categories = data.categories;
        db.selectedCategory = 0;
        db.selectedPresetId = "";
        db = sanitizeDB(db);
        save();
        rebuildCategoryTabs();
        renderCategoryContent();
        setStatus("📥 Import termine.");
      }catch(e){ try{ f.close(); }catch(_e2){} alert("Erreur import JSON: " + e.toString()); }
    }
    function csvCell(v){
      var s = String(v === undefined || v === null ? "" : v);
      return "\"" + s.replace(/"/g, "\"\"") + "\"";
    }
    function csvLine(cells){
      var out = [];
      for(var i=0; i<cells.length; i++) out.push(csvCell(cells[i]));
      return out.join(",");
    }
    function exportBlueprintMBCSV(){
      var f = File.saveDialog("Exporter le Blueprint MB (CSV)", "*.csv");
      if(!f) return;
      try{
        var lines = [];
        lines.push(csvLine([
          "category","preset","description","template","text_slots","image_slots"
        ]));
        for(var ci=0; ci<db.categories.length; ci++){
          var c = db.categories[ci];
          for(var pi=0; pi<c.presets.length; pi++){
            var p = c.presets[pi];
            lines.push(csvLine([
              c.name || "",
              p.name || "",
              p.description || "",
              p.modelComp || "",
              p.textSlots,
              p.imageSlots
            ]));
          }
        }
        f.encoding = "UTF-8";
        if(!f.open("w")) throw new Error("Ouverture ecriture impossible.");
        f.write(lines.join("\n"));
        f.close();
        setStatus("🧾 Blueprint MB compact exporte");
      }catch(e){
        try{ f.close(); }catch(_e){}
        alert("Erreur export Blueprint MB: " + e.toString());
      }
    }
    function writeTextFile(fileObj, text){
      fileObj.encoding = "UTF-8";
      if(!fileObj.open("w")) throw new Error("Ouverture ecriture impossible.");
      fileObj.write(String(text || ""));
      fileObj.close();
    }
    function mediaCatalogRows(mediaDbObj){
      var rows = [];
      for(var key in mediaDbObj){
        if(!mediaDbObj.hasOwnProperty(key)) continue;
        var path = trim(mediaDbObj[key] || "");
        if(!path) continue;
        var f = new File(path);
        rows.push({
          key: key,
          path: path,
          filename: (f && f.name) ? f.name : "",
          exists: File(path).exists ? "1" : "0"
        });
      }
      rows.sort(function(a,b){ return a.key < b.key ? -1 : (a.key > b.key ? 1 : 0); });
      return rows;
    }
    function buildPresetCatalogTxt(){
      var lines = ["Preset Catalog MB2", ""];
      for(var ci=0; ci<db.categories.length; ci++){
        var c = db.categories[ci];
        lines.push("[" + (c.name || "Categorie") + "]");
        for(var pi=0; pi<c.presets.length; pi++){
          var p = c.presets[pi];
          lines.push("- preset=" + (p.name || ""));
          lines.push("  template=" + (p.modelComp || ""));
          lines.push("  description=" + (p.description || ""));
          lines.push("  family=" + getPresetFamily(p));
          lines.push("  text_slots=" + toNum(p.textSlots, 0));
          lines.push("  image_slots=" + toNum(p.imageSlots, 0));
        }
        lines.push("");
      }
      return lines.join("\n");
    }
    function buildMediaCatalogCsv(mediaDbObj){
      var rows = mediaCatalogRows(mediaDbObj);
      var lines = [csvLine(["image_key","filename","full_path","exists"])];
      for(var i=0; i<rows.length; i++) lines.push(csvLine([rows[i].key, rows[i].filename, rows[i].path, rows[i].exists]));
      return lines.join("\n");
    }
    function buildMediaCatalogTxt(mediaDbObj){
      var rows = mediaCatalogRows(mediaDbObj);
      var lines = ["Media Catalog MB2", "", "Utiliser uniquement ces image_key réelles :", ""];
      for(var i=0; i<rows.length; i++) lines.push("- " + rows[i].key + " -> " + rows[i].filename);
      return lines.join("\n");
    }
    function buildMediaCatalogShortTxt(mediaDbObj, maxCount){
      var rows = mediaCatalogRows(mediaDbObj);
      var limit = Math.max(1, parseInt(toNum(maxCount, rows.length), 10));
      if(rows.length > limit) rows = rows.slice(0, limit);
      var lines = ["Media Keys MB2 - Short", "", "Utiliser uniquement ces image_key exactes:"];
      for(var i=0; i<rows.length; i++) lines.push("- " + rows[i].key);
      return lines.join("\n");
    }
    function buildCsvTemplateAgent(){
      return [
        csvLine([
          "time_in","time_out","preset","template","category","description",
          "text","text_1","text_2","text_3","text_4","text_5",
          "bullet_1","bullet_1_in","bullet_1_out",
          "bullet_2","bullet_2_in","bullet_2_out",
          "bullet_3","bullet_3_in","bullet_3_out",
          "bullet_4","bullet_4_in","bullet_4_out",
          "bullet_5","bullet_5_in","bullet_5_out",
          "bullet_6","bullet_6_in","bullet_6_out",
          "bullet_7","bullet_7_in","bullet_7_out",
          "bullet_8","bullet_8_in","bullet_8_out",
          "bullet_9","bullet_9_in","bullet_9_out",
          "image_key","image_key_1","image_key_2","image_key_3","image_key_4","text_slots","image_slots","spawn_x","spawn_y","dur","fade","x","y","blur"
        ]),
        csvLine([
          "00:00:05:00","00:00:11:00","Titre + Texte","","Essentiels","Exemple",
          "Titre principal","Sous-texte court","","","","",
          "","","","","","","","","","","","","","","","","","","","","","","","","","","","","",
          "","","","","","2","0","","","","","","",""
        ])
      ].join("\n");
    }
    function buildAgentInstructionsText(){
      return [
        "Tu génères un CSV pour Marker Builder 2.",
        "",
        "Ordre de priorité:",
        "1. Blueprint_MB.csv",
        "2. Media_Catalog_Short.txt",
        "3. Media_Catalog.csv si besoin",
        "4. CSV_Template_Agent.csv",
        "",
        "Règles absolues:",
        "- ne jamais inventer un preset",
        "- ne jamais inventer un template",
        "- ne jamais inventer une image_key",
        "- respecter strictement text_slots et image_slots",
        "- utiliser uniquement les valeurs présentes dans le pack",
        "- si aucune image ne convient, laisser image_key vide",
        "- produire uniquement le CSV final, sans texte autour"
      ].join("\n");
    }
    function buildTemplateContractText(){
      return [
        "Contrat Template MB2",
        "",
        "Objectif:",
        "- rendre les templates Marker Builder 2 fiables, detectables et injectables sans heuristiques fragiles",
        "",
        "Regles principales:",
        "- nommer explicitement les couches importantes",
        "- preferer les tags [mb2_text] et [mb2_image]",
        "- garder une structure simple et stable",
        "- eviter les precomps imbriquees inutiles",
        "",
        "Tags recommandes:",
        "- [mb2_text] : couche texte cible pour injection CSV",
        "- [mb2_image] : couche image cible pour image_key",
        "",
        "Priorite de detection MB2:",
        "1. couches taggees [mb2_text] / [mb2_image]",
        "2. noms de couches explicites: image, img, icon, logo, visuel, placeholder",
        "3. fallback heuristique sur layers remplacables",
        "",
        "Contrat par type de preset:",
        "",
        "1. Titre",
        "- 1 couche texte visible",
        "- idealement taggee [mb2_text]",
        "",
        "2. Texte",
        "- 1 couche texte visible",
        "- idealement taggee [mb2_text]",
        "",
        "3. Titre + Texte",
        "- 2 couches texte distinctes",
        "- ordre recommande: titre puis sous-texte",
        "- idealement les 2 couches taggees [mb2_text]",
        "",
        "4. Bulletpoint",
        "- 1 couche pour le titre du bloc si besoin",
        "- puis 3 a 9 couches texte distinctes pour les bullets",
        "- ordre recommande: titre, bullet1, bullet2, bullet3...",
        "- chaque ligne doit etre un vrai calque texte distinct",
        "- ne pas utiliser une seule zone texte multiline si on veut une animation par ligne",
        "",
        "5. Pop up / Champion focus / Item focus / Objectif / Spell / Rune",
        "- 1 couche image remplacable",
        "- idealement taggee [mb2_image]",
        "- si texte present: couches texte distinctes taggees [mb2_text]",
        "- garder un placeholder image propre et aux bonnes proportions",
        "",
        "6. Pop icons",
        "- 2 a 4 couches image remplacables distinctes",
        "- idealement toutes taggees [mb2_image]",
        "- ordre recommande: image principale puis images secondaires",
        "- utiliser un template pense pour plusieurs icones sur une meme ligne",
        "",
        "7. Conclusion",
        "- 1 couche texte minimum",
        "- template obligatoire si le preset est utilise en CSV strict",
        "",
        "Structure recommandee:",
        "- limiter l'imbrication a 1 niveau si possible",
        "- si precomp imbriquee necessaire, conserver les tags [mb2_text]/[mb2_image] dedans",
        "- eviter les layers caches ou verrouilles comme cibles principales",
        "",
        "Bonnes pratiques LoL:",
        "- Pop up pour champion, item, rune, objectif, summoner spell",
        "- Pop icons pour comparer rapidement plusieurs options visuelles sur une meme ligne",
        "- Bulletpoint pour checklist, plan d'action, erreurs a eviter, etapes",
        "- Titre + Texte pour introduire macro, wave, vision, trade, itemisation, tempo",
        "",
        "A eviter:",
        "- plusieurs usages differents sur une meme couche",
        "- placeholders non nommes",
        "- templates sans tag ni convention de nommage",
        "- trop d'imbrication pour des presets simples",
        "",
        "Regle d'or:",
        "- si un template doit etre fiable, marque explicitement ses cibles avec [mb2_text] et [mb2_image]"
      ].join("\n");
    }
    function buildAgentReadmeText(){
      return [
        "MB2 Agent Pack",
        "",
        "Contenu:",
        "- Blueprint_MB.csv",
        "- Preset_Catalog.txt",
        "- Media_Catalog.csv",
        "- Media_Catalog.txt",
        "- Media_Catalog_Short.txt",
        "- CSV_Template_Agent.csv",
        "- MB2_TEMPLATE_CONTRACT.txt",
        "- Agent_Instructions.txt",
        "",
        "Le GPT doit utiliser ce pack comme seule source de vérité."
      ].join("\n");
    }
    function exportAgentPack(){
      var root = Folder.selectDialog("Choisir le dossier de sortie pour le pack agent");
      if(!root) return;
      var pack = new Folder(root.fsName + "\\MB2_Agent_Pack");
      if(!pack.exists) pack.create();
      try{
        var blueprintLines = [];
        blueprintLines.push(csvLine(["category","preset","description","template","text_slots","image_slots"]));
        for(var ci=0; ci<db.categories.length; ci++){
          var c = db.categories[ci];
          for(var pi=0; pi<c.presets.length; pi++){
            var p = c.presets[pi];
            blueprintLines.push(csvLine([c.name || "", p.name || "", p.description || "", p.modelComp || "", p.textSlots, p.imageSlots]));
          }
        }
        writeTextFile(new File(pack.fsName + "\\Blueprint_MB.csv"), blueprintLines.join("\n"));
        writeTextFile(new File(pack.fsName + "\\Preset_Catalog.txt"), buildPresetCatalogTxt());
        writeTextFile(new File(pack.fsName + "\\Media_Catalog.csv"), buildMediaCatalogCsv(mediaDB));
        writeTextFile(new File(pack.fsName + "\\Media_Catalog.txt"), buildMediaCatalogTxt(mediaDB));
        writeTextFile(new File(pack.fsName + "\\Media_Catalog_Short.txt"), buildMediaCatalogShortTxt(mediaDB, 400));
        writeTextFile(new File(pack.fsName + "\\CSV_Template_Agent.csv"), buildCsvTemplateAgent());
        writeTextFile(new File(pack.fsName + "\\MB2_TEMPLATE_CONTRACT.txt"), buildTemplateContractText());
        writeTextFile(new File(pack.fsName + "\\Agent_Instructions.txt"), buildAgentInstructionsText());
        writeTextFile(new File(pack.fsName + "\\README_AGENT_PACK.txt"), buildAgentReadmeText());
        setStatus("🤖 Agent Pack exporté");
        alert("Agent Pack exporté dans:\n" + pack.fsName);
      }catch(e){
        alert("Erreur export Agent Pack: " + e.toString());
      }
    }
    function resetPresetLibraryWithBackup(){
      var doExport = confirm("⚠ Réinitialiser la bibliothèque presets du plugin ?\n\nOui = proposer un export de sauvegarde avant reset\nNon = reset direct");
      if(doExport){
        exportPresets();
      }
      if(!confirm("Confirmer la réinitialisation ?\nToutes les catégories/presets plugin seront remplacés par les valeurs par défaut.")) return;
      db = defaultDB();
      db = sanitizeDB(db);
      save();
      rebuildCategoryTabs();
      renderCategoryContent();
      updateIndicators();
      setStatus("♻ Bibliothèque presets réinitialisée");
    }
    function repairUIState(){
      try{
        db = sanitizeDB(db);
        save();
        rebuildCategoryTabs();
        renderCategoryContent();
        updateIndicators();
        safeRelayout();
        setStatus("🛠 Interface réparée et rechargée");
      }catch(e){
        alert("Réparation UI échouée: " + e.toString());
      }
    }
    function createOrSelectStackAnchorAction(){
      var comp = activeComp();
      if(!comp){ alert("Ouvre une composition active."); return; }
      app.beginUndoGroup("MB2 Stack Anchor");
      try{
        var existed = !!findStackAnchorLayer(comp);
        var anchor = ensureStackAnchor(comp, true, true);
        if(!anchor){ alert("Impossible de créer/sélectionner l'ancre."); return; }
        setStatus(existed ? "⚓ Ancre pile sélectionnée" : "⚓ Ancre pile créée et sélectionnée");
      }finally{
        app.endUndoGroup();
      }
    }
    function openMediaDbWindow(){
      var w = new Window("dialog", "Base médias interne - Marker Builder 2");
      w.orientation = "column";
      w.alignChildren = ["fill", "top"];
      w.margins = 10;
      w.spacing = 8;
      try{ w.minimumSize = [760, 520]; }catch(_eWinMin){}
      function mediaKeyFromPath(rootFs, fileFs){
        var root = String(rootFs || "");
        var full = String(fileFs || "");
        var rel = full;
        if(root && full.toLowerCase().indexOf(root.toLowerCase()) === 0){
          rel = full.substring(root.length);
        }
        rel = rel.replace(/^[\\\/]+/, "");
        rel = rel.replace(/\.[^.]+$/, "");
        rel = rel.replace(/[\\\/]+/g, "_");
        rel = normalizeKey(rel);
        rel = rel.replace(/^_+|_+$/g, "");
        return rel || normalizeKey((new File(full)).displayName || "media");
      }
      function collectImageFilesRecursive(folder, out){
        if(!folder || !(folder instanceof Folder)) return out;
        if(!out) out = [];
        var items = [];
        try{ items = folder.getFiles(); }catch(_eFiles){ items = []; }
        for(var i=0; i<items.length; i++){
          var it = items[i];
          if(it instanceof Folder){
            collectImageFilesRecursive(it, out);
            continue;
          }
          if(!(it instanceof File)) continue;
          var nm = String(it.name || "").toLowerCase();
          if(/\.(png|jpe?g|webp|gif|tif|tiff|bmp|psd|ai|svg)$/.test(nm)) out.push(it);
        }
        return out;
      }
      function shortPath(path, maxLen){
        var s = String(path || "");
        var limit = Math.max(24, parseInt(toNum(maxLen, 72), 10));
        if(s.length <= limit) return s;
        var keep = Math.max(10, Math.floor((limit - 3) * 0.5));
        return s.substring(0, keep) + "..." + s.substring(s.length - keep);
      }
      function mediaGroupFromPath(path){
        var s = String(path || "").replace(/\//g, "\\");
        var marker = "04.ASSET LOL\\";
        var idx = s.toLowerCase().indexOf(marker.toLowerCase());
        var rel = idx >= 0 ? s.substring(idx + marker.length) : s;
        rel = rel.replace(/^[\\]+/, "");
        var parts = rel.split("\\");
        return trim(parts.length ? parts[0] : "") || "Autre";
      }
      function mediaRowsFiltered(){
        var q = normalizeKey(edSearchMedia.text || "");
        var wantedGroup = ddGroup.selection ? ddGroup.selection.text : "Tous";
        var rows = [];
        for(var key in mediaDB){
          if(!mediaDB.hasOwnProperty(key)) continue;
          var path = mediaDB[key] || "";
          var fileName = "";
          try{ fileName = (new File(path)).name || ""; }catch(_eFileName){ fileName = ""; }
          var group = mediaGroupFromPath(path);
          var hay = normalizeKey(key + " " + fileName + " " + path + " " + group);
          if(q && hay.indexOf(q) < 0) continue;
          if(wantedGroup !== "Tous" && group !== wantedGroup) continue;
          rows.push({ key: key, path: path, fileName: fileName, group: group });
        }
        rows.sort(function(a,b){ return a.key < b.key ? -1 : (a.key > b.key ? 1 : 0); });
        return rows;
      }
      function refreshGroups(){
        var prev = ddGroup.selection ? ddGroup.selection.text : "Tous";
        ddGroup.removeAll();
        ddGroup.add("item", "Tous");
        var seen = { "Tous": true };
        var groups = [];
        for(var key in mediaDB){
          if(!mediaDB.hasOwnProperty(key)) continue;
          var g = mediaGroupFromPath(mediaDB[key] || "");
          if(!seen[g]){
            seen[g] = true;
            groups.push(g);
          }
        }
        groups.sort();
        for(var gi=0; gi<groups.length; gi++) ddGroup.add("item", groups[gi]);
        ddGroup.selection = 0;
        for(var gj=0; gj<ddGroup.items.length; gj++) if(ddGroup.items[gj].text === prev){ ddGroup.selection = gj; break; }
      }
      function copyTextToClipboard(text){
        var s = String(text || "");
        if(!s) return false;
        try{
          if($.os && $.os.toLowerCase().indexOf("windows") >= 0){
            var escaped = s.replace(/"/g, "\"\"");
            system.callSystem('cmd.exe /c echo ' + escaped + ' | clip');
            return true;
          }
        }catch(_eClip){}
        return false;
      }
      function exportMediaDbOnly(){
        var root = Folder.selectDialog("Choisir le dossier de sortie pour la base médias");
        if(!root) return;
        try{
          writeTextFile(new File(root.fsName + "\\Media_Catalog.csv"), buildMediaCatalogCsv(mediaDB));
          writeTextFile(new File(root.fsName + "\\Media_Catalog.txt"), buildMediaCatalogTxt(mediaDB));
          writeTextFile(new File(root.fsName + "\\Media_Catalog_Short.txt"), buildMediaCatalogShortTxt(mediaDB, 400));
          setStatus("🖼 Base médias exportée");
          alert("Base médias exportée dans:\n" + root.fsName);
        }catch(e){
          alert("Erreur export base médias: " + e.toString());
        }
      }

      var topInfo = w.add("group");
      topInfo.orientation = "row";
      topInfo.alignChildren = ["fill", "center"];
      var edSearchMedia = topInfo.add("edittext", undefined, "");
      edSearchMedia.minimumSize = [260, 24];
      edSearchMedia.helpTip = "Recherche par image_key, nom de fichier ou chemin.";
      var ddGroup = topInfo.add("dropdownlist", undefined, ["Tous"]);
      ddGroup.minimumSize = [140, 24];
      ddGroup.helpTip = "Filtrer par dossier logique (ex: Champions, Items).";
      var stCount = topInfo.add("statictext", undefined, "0 asset(s)");
      stCount.characters = 24;

      var list = w.add("listbox", undefined, [], { multiselect: false });
      list.minimumSize = [720, 280];

      var details = w.add("panel", undefined, "Détail sélection");
      details.orientation = "column";
      details.alignChildren = ["fill", "top"];
      details.margins = 8;
      var stKey = details.add("statictext", undefined, "image_key: -");
      var stFile = details.add("statictext", undefined, "fichier: -");
      var stGroup = details.add("statictext", undefined, "groupe: -");
      var stPath = details.add("edittext", undefined, "", { multiline: true, readonly: true });
      stPath.minimumSize = [720, 54];
      var rowDetailBtns = details.add("group");
      rowDetailBtns.orientation = "row";
      var bCopyKey = rowDetailBtns.add("button", undefined, "Copier image_key");
      bCopyKey.enabled = false;

      var row = w.add("group");
      row.orientation = "row";
      var k = row.add("edittext", undefined, "");
      k.minimumSize = [140, 24];
      var p = row.add("edittext", undefined, "");
      p.minimumSize = [320, 24];
      var bBrowse = row.add("button", undefined, "📁");
      var row2 = w.add("group");
      row2.orientation = "row";
      var bAdd = row2.add("button", undefined, "Ajouter/Mettre à jour");
      var bImportFolder = row2.add("button", undefined, "Importer dossier");
      var bExportMedia = row2.add("button", undefined, "Exporter base");
      var bDel = row2.add("button", undefined, "Supprimer");
      var bClose = row2.add("button", undefined, "Fermer");
      var visibleKeys = [];

      function refresh(){
        list.removeAll();
        visibleKeys = [];
        var rows = mediaRowsFiltered();
        for(var i=0; i<rows.length; i++){
          list.add("item", rows[i].key + " | " + rows[i].group + " | " + rows[i].fileName + " | " + shortPath(rows[i].path, 72));
          visibleKeys.push(rows[i].key);
        }
        stCount.text = visibleKeys.length + " asset(s)";
        stKey.text = "image_key: -";
        stFile.text = "fichier: -";
        stGroup.text = "groupe: -";
        stPath.text = "";
        bCopyKey.enabled = false;
      }
      function selectedKey(){
        if(!list.selection) return "";
        return visibleKeys[list.selection.index] || "";
      }
      list.onChange = function(){
        var sk = selectedKey();
        if(!sk) return;
        k.text = sk;
        p.text = mediaDB[sk] || "";
        stKey.text = "image_key: " + sk;
        try{ stFile.text = "fichier: " + ((new File(mediaDB[sk] || "")).name || "-"); }catch(_eName){ stFile.text = "fichier: -"; }
        stGroup.text = "groupe: " + mediaGroupFromPath(mediaDB[sk] || "");
        stPath.text = mediaDB[sk] || "";
        bCopyKey.enabled = true;
      };
      edSearchMedia.onChanging = function(){ refresh(); };
      ddGroup.onChange = function(){ refresh(); };
      bCopyKey.onClick = function(){
        var sk = selectedKey();
        if(!sk) return;
        if(copyTextToClipboard(sk)) setStatus("📋 image_key copiée: " + sk);
        else alert("Copie presse-papiers non disponible ici.\nimage_key: " + sk);
      };
      bBrowse.onClick = function(){
        var f = File.openDialog("Choisir un média");
        if(f) p.text = f.fsName || f.fullName || f.toString();
      };
      bAdd.onClick = function(){
        var key = trim(k.text || "");
        var path = trim(p.text || "");
        if(!key || !path){ alert("Renseigne une clé et un chemin."); return; }
        mediaDB[key] = path;
        saveMediaDB(mediaDB);
        refreshGroups();
        refresh();
        stKey.text = "image_key: " + key;
        try{ stFile.text = "fichier: " + ((new File(path)).name || "-"); }catch(_eName2){ stFile.text = "fichier: -"; }
        stGroup.text = "groupe: " + mediaGroupFromPath(path);
        stPath.text = path;
        bCopyKey.enabled = true;
      };
      bImportFolder.onClick = function(){
        var root = Folder.selectDialog("Choisir le dossier racine des images");
        if(!root) return;
        var files = collectImageFilesRecursive(root, []);
        if(!files.length){
          alert("Aucun fichier image détecté dans ce dossier.");
          return;
        }
        var added = 0, updated = 0;
        var duplicateKeys = [];
        var seenImport = {};
        for(var i=0; i<files.length; i++){
          var f = files[i];
          var key = mediaKeyFromPath(root.fsName || root.fullName || root.toString(), f.fsName || f.fullName || f.toString());
          if(!key) continue;
          if(seenImport[key]){
            duplicateKeys.push(key + " -> " + (f.fsName || f.fullName || f.toString()));
            continue;
          }
          seenImport[key] = true;
          if(mediaDB.hasOwnProperty(key)) updated++;
          else added++;
          mediaDB[key] = f.fsName || f.fullName || f.toString();
        }
        saveMediaDB(mediaDB);
        refreshGroups();
        refresh();
        setStatus("🖼 Base médias importée: +" + added + " / maj " + updated);
        var msg = "Import dossier terminé.\nAjoutés: " + added + "\nMis à jour: " + updated + "\nTotal scanné: " + files.length;
        if(duplicateKeys.length){
          msg += "\nDoublons de clés ignorés dans cet import: " + duplicateKeys.length;
          msg += "\nExemples:\n- " + duplicateKeys.slice(0, 8).join("\n- ");
        }
        alert(msg);
      };
      bExportMedia.onClick = function(){ exportMediaDbOnly(); };
      bDel.onClick = function(){
        var sk = selectedKey();
        if(!sk) return;
        if(!confirm("Supprimer la clé média '" + sk + "' ?")) return;
        delete mediaDB[sk];
        saveMediaDB(mediaDB);
        refreshGroups();
        refresh();
      };
      bClose.onClick = function(){ w.close(); };

      refreshGroups();
      refresh();
      w.show();
    }

    function findPresetByNameInDB(name, categoryName){
      var wanted = trim(name || "").toLowerCase();
      if(!wanted) return null;
      var wantedCat = trim(categoryName || "").toLowerCase();
      var ci, pi;
      if(wantedCat){
        for(ci=0; ci<db.categories.length; ci++){
          if(trim(db.categories[ci].name || "").toLowerCase() !== wantedCat) continue;
          for(pi=0; pi<db.categories[ci].presets.length; pi++){
            var p0 = db.categories[ci].presets[pi];
            if(trim(p0.name || "").toLowerCase() === wanted) return p0;
          }
        }
      }
      for(ci=0; ci<db.categories.length; ci++){
        for(pi=0; pi<db.categories[ci].presets.length; pi++){
          var p = db.categories[ci].presets[pi];
          if(trim(p.name || "").toLowerCase() === wanted) return p;
        }
      }
      return null;
    }

    function pickCsvValueByMapping(row, field, mapping){
      if(mapping && mapping[field]){
        var k = normalizeKey(mapping[field]);
        if(row && row[k] !== undefined && row[k] !== null) return trim(row[k]);
        return "";
      }
      return pickCsvValue(row, field);
    }

    function buildCsvPresetFromRow(row, mapping){
      var presetName = pickCsvValueByMapping(row, "preset", mapping);
      var catName = pickCsvValueByMapping(row, "category", mapping);
      var template = pickCsvValueByMapping(row, "template", mapping);
      var base = presetName ? findPresetByNameInDB(presetName, catName) : null;
      var p = base ? parseJSON(stringifyJSON(base)) : presetDefaults(presetName || "CSV", db);
      if(template){
        p.modelComp = template;
      }else{
        p.modelComp = trim(p.modelComp || "");
      }
      if(!p.name) p.name = presetName || template || "CSV";
      var dur = pickCsvValueByMapping(row, "dur", mapping);
      var fade = pickCsvValueByMapping(row, "fade", mapping);
      var mx = pickCsvValueByMapping(row, "x", mapping);
      var my = pickCsvValueByMapping(row, "y", mapping);
      var spawnAnchor = pickCsvValueByMapping(row, "spawn_anchor", mapping);
      var spawnX = pickCsvValueByMapping(row, "spawn_x", mapping);
      var spawnY = pickCsvValueByMapping(row, "spawn_y", mapping);
      var textSlots = pickCsvValueByMapping(row, "text_slots", mapping);
      var imageSlots = pickCsvValueByMapping(row, "image_slots", mapping);
      var blur = pickCsvValueByMapping(row, "blur", mapping);
      if(dur) p.dur = toNum(dur, p.dur);
      if(fade) p.fade = toNum(fade, p.fade);
      if(mx) p.moveX = toNum(mx, p.moveX);
      if(my) p.moveY = toNum(my, p.moveY);
      if(spawnAnchor) p.spawnAnchor = normalizeKey(spawnAnchor);
      if(spawnX) p.spawnOffsetX = toNum(spawnX, p.spawnOffsetX);
      if(spawnY) p.spawnOffsetY = toNum(spawnY, p.spawnOffsetY);
      if(textSlots) p.textSlots = Math.max(0, parseInt(toNum(textSlots, p.textSlots), 10));
      if(imageSlots) p.imageSlots = Math.max(0, parseInt(toNum(imageSlots, p.imageSlots), 10));
      if(blur) p.blur = toNum(blur, p.blur);
      return p;
    }
    function extractBulletTexts(row, mapping){
      var out = [];
      var fromPacked = pickCsvValueByMapping(row, "bullets", mapping);
      if(fromPacked){
        var parts = fromPacked.split("|");
        for(var i=0; i<parts.length; i++){
          var t = trim(parts[i]);
          if(t) out.push(t);
        }
      }
      var idx = 1;
      while(idx <= 20){
        var key = "bullet_" + idx;
        if(row[key] === undefined) break;
        var v = trim(row[key] || "");
        if(v) out.push(v);
        idx++;
      }
      return out;
    }
    function extractBulletCueEntries(row, fps, baseTime){
      var out = [];
      for(var i=1; i<=20; i++){
        var tKey = "bullet_" + i;
        var text = trim(row[tKey] || "");
        if(!text) continue;
        var inRaw = trim(row["bullet_" + i + "_in"] || row["b" + i + "_in"] || "");
        var outRaw = trim(row["bullet_" + i + "_out"] || row["b" + i + "_out"] || "");
        var tIn = parseCsvTimeFlexible(inRaw, fps);
        var tOut = parseCsvTimeFlexible(outRaw, fps);
        if(tIn !== null && baseTime !== null && tIn < baseTime){
          // If value looks like an offset (earlier than row IN), convert to absolute from row IN.
          tIn = baseTime + Math.max(0, tIn);
        }
        if(tOut !== null && baseTime !== null && tOut < baseTime){
          tOut = baseTime + Math.max(0, tOut);
        }
        if(tIn !== null && tOut !== null && tOut <= tIn) tOut = null;
        out.push({ text: text, inTime: tIn, outTime: tOut });
      }
      return out;
    }
    function extractIndexedValues(row, prefix, maxCount){
      var out = [];
      var maxN = maxCount || 20;
      for(var i=1; i<=maxN; i++){
        var key = prefix + i;
        if(row[key] === undefined) continue;
        var v = trim(row[key] || "");
        if(v) out.push(v);
      }
      return out;
    }
    function resolveCsvImagePath(row, mapping){
      var direct = pickCsvValueByMapping(row, "image", mapping);
      if(direct) return { path: direct, source: "path" };
      var key = pickCsvValueByMapping(row, "image_key", mapping);
      if(key && mediaDB[key]) return { path: trim(mediaDB[key] || ""), source: "key", key: key };
      return { path: "", source: key ? "key-missing" : "none", key: key };
    }
    function resolveCsvImagePaths(row, mapping){
      var out = [];
      var main = resolveCsvImagePath(row, mapping);
      if(main.path) out.push(main);
      else if(main.source === "key-missing") out.push(main);
      for(var i=1; i<=20; i++){
        var p = trim(row["image_" + i] || "");
        var k = trim(row["image_key_" + i] || "");
        if(p){
          out.push({ path: p, source: "path", key: "" });
          continue;
        }
        if(k){
          if(mediaDB[k]) out.push({ path: trim(mediaDB[k] || ""), source: "key", key: k });
          else out.push({ path: "", source: "key-missing", key: k });
        }
      }
      return out;
    }

    function validateCsvRows(parsed, comp, mappingOverride, opts){
      opts = opts || {};
      var strictBlueprint = (opts.strictBlueprint !== false);
      var mapping = mappingOverride || detectCsvMapping(parsed.headers || []);
      function hasHeader(name){
        var wanted = normalizeKey(name || "");
        var headers = parsed.headers || [];
        for(var hi=0; hi<headers.length; hi++) if(normalizeKey(headers[hi]) === wanted) return true;
        return false;
      }
      var report = {
        jobs: [],
        errors: [],
        warnings: [],
        meta: {
          rowsTotal: parsed.rows.length,
          headers: parsed.headers || [],
          mapping: mapping,
          strictBlueprint: strictBlueprint
        }
      };
      var fps = comp ? comp.frameRate : 25;
      var templateCache = {};
      if(hasHeader("text1") || hasHeader("image1")){
        report.errors.push("Ancien format CSV détecté (text1/image1). Utilise strictement CSV_Template_Agent.csv avec text, text_1..n et image_key.");
        return report;
      }
      if(!mapping.timecode && !mapping.time_in) report.warnings.push("Colonne IN non detectee automatiquement (alias: timecode/in/start/time).");
      if(!mapping.template) report.warnings.push("Colonne template non detectee automatiquement (alias: template/template_comp/comp/modele).");
      for(var i=0; i<parsed.rows.length; i++){
        var r = parsed.rows[i];
        var lineNo = r.__line || (i + 2);
        var tcIn = pickCsvValueByMapping(r, "time_in", mapping);
        if(!tcIn) tcIn = pickCsvValueByMapping(r, "timecode", mapping);
        var tcOut = pickCsvValueByMapping(r, "time_out", mapping);
        var csvTemplate = pickCsvValueByMapping(r, "template", mapping);
        var presetName = pickCsvValueByMapping(r, "preset", mapping);
        var catName = pickCsvValueByMapping(r, "category", mapping);
        var presetRef = presetName ? findPresetByNameInDB(presetName, catName) : null;
        var presetTemplate = presetRef ? trim(presetRef.modelComp || "") : "";
        if(strictBlueprint){
          if(!presetName){
            report.errors.push("Ligne " + lineNo + ": preset manquant (mode strict Blueprint)");
            continue;
          }
          if(!presetRef){
            report.errors.push("Ligne " + lineNo + ": preset introuvable dans Blueprint (" + presetName + ")");
            continue;
          }
          if(!presetTemplate){
            report.errors.push("Ligne " + lineNo + ": preset sans template dans Blueprint (" + presetName + ")");
            continue;
          }
        }
        var template = csvTemplate || presetTemplate;
        // Si le CSV met "template" = nom du preset, on considère que l'intention
        // est d'utiliser la comp modèle du preset (évite les faux warnings).
        if(csvTemplate && presetTemplate && presetName){
          var csvNorm = trim(csvTemplate).toLowerCase();
          var presetNameNorm = trim(presetName).toLowerCase();
          if(csvNorm === presetNameNorm) template = presetTemplate;
          if(strictBlueprint && csvNorm !== presetNameNorm && csvNorm !== trim(presetTemplate).toLowerCase()){
            report.errors.push("Ligne " + lineNo + ": template CSV différent du Blueprint pour preset '" + presetName + "'");
            continue;
          }
        }
        if(!tcIn){ report.errors.push("Ligne " + lineNo + ": timecode IN manquant"); continue; }
        if(!template){
          if(presetName){
            report.errors.push("Ligne " + lineNo + ": template manquant (preset '" + presetName + "' sans comp modèle)");
          }else{
            report.errors.push("Ligne " + lineNo + ": template manquant (et aucun preset exploitable)");
          }
          continue;
        }
        var t = parseTimecodeToSeconds(tcIn, fps);
        if(t === null || isNaN(t) || t < 0){ report.errors.push("Ligne " + lineNo + ": timecode IN invalide (" + tcIn + ")"); continue; }
        var tOut = null;
        if(tcOut){
          tOut = parseTimecodeToSeconds(tcOut, fps);
          if(tOut === null || isNaN(tOut) || tOut < 0){ report.errors.push("Ligne " + lineNo + ": timecode OUT invalide (" + tcOut + ")"); continue; }
          if(tOut <= t){ report.errors.push("Ligne " + lineNo + ": OUT doit être > IN"); continue; }
        }
        // Validation stricte des timings bullet_n_in/out (évite les déclenchements incohérents).
        var bulletTimingInvalid = false;
        var prevBulletIn = null;
        for(var bi=1; bi<=20; bi++){
          var bText = trim(r["bullet_" + bi] || "");
          if(!bText) continue;
          var bInRaw = trim(r["bullet_" + bi + "_in"] || r["b" + bi + "_in"] || "");
          var bOutRaw = trim(r["bullet_" + bi + "_out"] || r["b" + bi + "_out"] || "");
          if(!bInRaw && !bOutRaw) continue;
          var bIn = null;
          var bOut = null;
          if(bInRaw){
            bIn = parseCsvTimeFlexible(bInRaw, fps);
            if(bIn === null || isNaN(bIn)){
              report.errors.push("Ligne " + lineNo + ": bullet_" + bi + "_in invalide (" + bInRaw + ")");
              bulletTimingInvalid = true;
              continue;
            }
            if(bIn < t) bIn = t + Math.max(0, bIn);
          }
          if(bOutRaw){
            bOut = parseCsvTimeFlexible(bOutRaw, fps);
            if(bOut === null || isNaN(bOut)){
              report.errors.push("Ligne " + lineNo + ": bullet_" + bi + "_out invalide (" + bOutRaw + ")");
              bulletTimingInvalid = true;
              continue;
            }
            if(bOut < t) bOut = t + Math.max(0, bOut);
          }
          if(bIn !== null && bOut !== null && bOut <= bIn){
            report.errors.push("Ligne " + lineNo + ": bullet_" + bi + "_out doit être > bullet_" + bi + "_in");
            bulletTimingInvalid = true;
            continue;
          }
          if(tOut !== null){
            if(bIn !== null && bIn > tOut){
              report.errors.push("Ligne " + lineNo + ": bullet_" + bi + "_in dépasse time_out de la ligne");
              bulletTimingInvalid = true;
              continue;
            }
            if(bOut !== null && bOut > tOut){
              report.errors.push("Ligne " + lineNo + ": bullet_" + bi + "_out dépasse time_out de la ligne");
              bulletTimingInvalid = true;
              continue;
            }
          }
          if(bIn !== null){
            if(prevBulletIn !== null && bIn < prevBulletIn){
              report.errors.push("Ligne " + lineNo + ": bullet timings non croissants (bullet_" + bi + "_in < bullet précédent)");
              bulletTimingInvalid = true;
              continue;
            }
            prevBulletIn = bIn;
          }
        }
        if(bulletTimingInvalid) continue;
        if(templateCache[template] === undefined) templateCache[template] = !!findCompByName(template);
        if(!templateCache[template]){
          if(strictBlueprint){
            report.errors.push("Ligne " + lineNo + ": template introuvable (" + template + ") en mode strict Blueprint");
            continue;
          }
          if(csvTemplate && presetTemplate && trim(csvTemplate).toLowerCase() !== trim(presetTemplate).toLowerCase()){
            if(templateCache[presetTemplate] === undefined) templateCache[presetTemplate] = !!findCompByName(presetTemplate);
            if(templateCache[presetTemplate]){
              template = presetTemplate;
              report.warnings.push("Ligne " + lineNo + ": template CSV introuvable (" + csvTemplate + "), fallback preset -> " + presetTemplate);
            }else{
              report.errors.push("Ligne " + lineNo + ": template introuvable (" + csvTemplate + ") et fallback preset introuvable (" + presetTemplate + ")");
              continue;
            }
          }else{
            report.errors.push("Ligne " + lineNo + ": template introuvable (" + template + ")");
            continue;
          }
        }
        if(comp && t > comp.duration){
          report.warnings.push("Ligne " + lineNo + ": timecode au-dela de la duree comp active");
        }
        var imageItems = resolveCsvImagePaths(r, mapping);
        var imagePath = imageItems.length ? trim(imageItems[0].path || "") : "";
        for(var ir=0; ir<imageItems.length; ir++){
          var item = imageItems[ir];
          if(item.source === "key-missing"){
            report.warnings.push("Ligne " + lineNo + ": image_key introuvable dans la base interne (" + item.key + ")");
          }else if(item.path && !File(item.path).exists){
            report.warnings.push("Ligne " + lineNo + ": image introuvable (" + item.path + "), ligne conservée");
          }
        }
        var textList = extractIndexedValues(r, "text_", 20);
        var bullets = extractBulletTexts(r, mapping);
        var bulletCues = extractBulletCueEntries(r, fps, t);
        var preset = buildCsvPresetFromRow(r, mapping);
        preset.modelComp = template;
        if(tOut !== null){
          preset.dur = Math.max(0.001, tOut - t);
        }
        var schema0 = detectTemplateFieldSchema(template);
        var audit0 = auditTemplateContract(template);
        var family0 = getPresetFamily(preset);
        var desiredTextCount = 0;
        var desiredImageCount = 0;
        desiredTextCount += trim(pickCsvValueByMapping(r, "text", mapping) || "") ? 1 : 0;
        desiredTextCount += textList.length;
        desiredTextCount += Math.max(bullets.length, bulletCues.length);
        desiredImageCount += imageItems.length;
        if(family0 === "visual" && audit0.imageCount <= 0){
          report.warnings.push("Ligne " + lineNo + ": preset visuel mais template sans cible image détectée (" + template + ")");
        }
        if(family0 === "text" && audit0.textCount <= 0){
          report.warnings.push("Ligne " + lineNo + ": preset texte mais template sans cible texte détectée (" + template + ")");
        }
        if(desiredTextCount > 0 && audit0.textCount > 0 && desiredTextCount > audit0.textCount){
          report.warnings.push("Ligne " + lineNo + ": contenu texte plus riche que le template (" + desiredTextCount + " demandés / " + audit0.textCount + " détectés)");
        }
        if(desiredImageCount > 0 && audit0.imageCount > 0 && desiredImageCount > audit0.imageCount){
          report.warnings.push("Ligne " + lineNo + ": contenu image plus riche que le template (" + desiredImageCount + " demandés / " + audit0.imageCount + " détectés)");
        }
        if(audit0.maxDepth > 1 && (family0 === "visual" || desiredImageCount > 0 || Math.max(bullets.length, bulletCues.length) > 1)){
          report.warnings.push("Ligne " + lineNo + ": template imbriqué profond, injection plus fragile (" + template + ")");
        }
        if(schema0.text > 0) preset.textSlots = Math.max(toNum(preset.textSlots, 0), schema0.text);
        if(schema0.image > 0) preset.imageSlots = Math.max(toNum(preset.imageSlots, 0), schema0.image);
        if(textList.length > 0) preset.textSlots = Math.max(toNum(preset.textSlots, 0), textList.length);
        if(bullets.length > 0) preset.textSlots = Math.max(toNum(preset.textSlots, 0), bullets.length);
        if(bulletCues.length > 0) preset.textSlots = Math.max(toNum(preset.textSlots, 0), bulletCues.length);
        report.jobs.push({
          line: lineNo,
          time: t,
          timeOut: tOut,
          preset: preset,
          raw: r,
          text: pickCsvValueByMapping(r, "text", mapping),
          textList: textList,
          bullets: bullets,
          bulletCues: bulletCues,
          imagePath: imagePath,
          imagePaths: imageItems,
          imageSource: (imageItems.length ? imageItems[0].source : "none"),
          imageKey: (imageItems.length ? (imageItems[0].key || "") : "")
        });
      }
      if(report.jobs.length > 1){
        report.jobs.sort(function(a,b){ return a.time - b.time; });
        var totalGap = 0;
        var gapCount = 0;
        var denseCount = 0;
        for(var gi=1; gi<report.jobs.length; gi++){
          var dt = report.jobs[gi].time - report.jobs[gi-1].time;
          if(isNaN(dt) || dt < 0) continue;
          totalGap += dt;
          gapCount++;
          if(dt < 8) denseCount++;
        }
        if(gapCount > 0){
          var avgGap = totalGap / gapCount;
          if(avgGap < 10){
            report.warnings.push("Densité élevée: intervalle moyen entre overlays = " + avgGap.toFixed(1) + "s (recommandé: 10-20s).");
          }
          if(denseCount >= 3){
            report.warnings.push("Plusieurs overlays sont très proches (<8s). Risque de sur-génération visuelle.");
          }
        }
      }
      return report;
    }

    function csvReportSummary(report, comp){
      var msg = "📄 Import CSV - Aperçu\n\n";
      msg += "Composition active: " + (comp ? comp.name : "aucune") + "\n";
      msg += "Lignes source: " + (report.meta ? report.meta.rowsTotal : report.jobs.length) + "\n";
      msg += "Lignes valides: " + report.jobs.length + "\n";
      msg += "Erreurs: " + report.errors.length + "\n";
      msg += "Warnings: " + report.warnings.length + "\n\n";
      if(report.meta) msg += "Mode strict Blueprint: " + (report.meta.strictBlueprint ? "ON" : "OFF") + "\n\n";
      if(report.meta && report.meta.mapping){
        var m = report.meta.mapping;
        msg += "Mapping detecte:\n";
        msg += "- time_in -> " + (m.time_in || m.timecode || "non detecte") + "\n";
        msg += "- time_out -> " + (m.time_out || "non detecte") + "\n";
        msg += "- template -> " + (m.template || "non detecte") + "\n";
        msg += "- texte -> " + (m.text || "non detecte") + "\n";
        msg += "- image -> " + (m.image || "non detecte") + "\n";
        msg += "- image_key -> " + (m.image_key || "non detecte") + "\n";
        msg += "- bullets -> " + (m.bullets || "non detecte") + "\n";
        msg += "- text_slots -> " + (m.text_slots || "non detecte") + "\n";
        msg += "- image_slots -> " + (m.image_slots || "non detecte") + "\n";
        msg += "- spawn_anchor -> " + (m.spawn_anchor || "non detecte") + "\n";
        msg += "- preset -> " + (m.preset || "non detecte") + "\n";
        msg += "- categorie -> " + (m.category || "non detecte") + "\n\n";
      }
      if(report.errors.length){
        msg += "Exemples erreurs:\n";
        for(var ei=0; ei<Math.min(5, report.errors.length); ei++) msg += "• " + report.errors[ei] + "\n";
        msg += "\n";
      }
      return msg;
    }

    function applyCsvTextToInstance(instanceComp, textValue, bulletTexts, textList, slotLimit, bulletCues, baseCompTime, clipDuration){
      if(!instanceComp) return 0;
      var i;
      var values = [];
      var txt = trim(textValue || "");
      var hasTextList = !!(textList && textList.length);
      var hasBulletCues = !!(bulletCues && bulletCues.length);
      var hasBulletTexts = !!(bulletTexts && bulletTexts.length);
      var bulletStartIndex = 0;
      if(txt) values.push(txt);
      if(hasTextList){
        for(i=0; i<textList.length; i++) if(trim(textList[i] || "")) values.push(trim(textList[i]));
      }
      bulletStartIndex = values.length;
      if(hasBulletCues){
        for(i=0; i<bulletCues.length; i++) if(trim((bulletCues[i] && bulletCues[i].text) || "")) values.push(trim(bulletCues[i].text));
      }else if(hasBulletTexts){
        for(i=0; i<bulletTexts.length; i++) if(trim(bulletTexts[i] || "")) values.push(trim(bulletTexts[i]));
      }
      if(values.length === 0) return 0;
      function collectTextLayersRecursive(compItem, needCount, depth){
        var localLayers = [];
        var nestedLayers = [];
        if(!compItem || depth > 2) return localLayers;
        var li, ly, srcText, src;
        for(li=1; li<=compItem.numLayers; li++){
          ly = compItem.layer(li);
          srcText = null;
          try{ srcText = ly.property("Source Text"); }catch(_e1){ srcText = null; }
          if(srcText) localLayers.push({ layer: ly, prop: srcText, order: localLayers.length + nestedLayers.length });
        }
        if(localLayers.length >= needCount) return localLayers;
        for(li=1; li<=compItem.numLayers; li++){
          ly = compItem.layer(li);
          src = null;
          try{ src = ly.source; }catch(_eTxtSrc){ src = null; }
          if(src && (src instanceof CompItem)){
            var nestedComp = src;
            try{
              nestedComp = src.duplicate();
              ly.replaceSource(nestedComp, false);
            }catch(_eTxtDup){
              nestedComp = src;
            }
            var found = collectTextLayersRecursive(nestedComp, Math.max(0, needCount - localLayers.length - nestedLayers.length), depth + 1);
            for(var fi=0; fi<found.length; fi++) nestedLayers.push(found[fi]);
            if((localLayers.length + nestedLayers.length) >= needCount) break;
          }
        }
        return localLayers.concat(nestedLayers);
      }
      var textLayers = collectTextLayersRecursive(instanceComp, values.length, 0);
      if(textLayers.length === 0) return 0;
      var maxSlots = Math.max(0, parseInt(toNum(slotLimit, textLayers.length), 10));
      // Si le CSV fournit plusieurs lignes texte/bullets, on ne bloque pas à 1 slot.
      if(values.length > maxSlots) maxSlots = values.length;
      if(maxSlots > 0 && textLayers.length > maxSlots) textLayers = textLayers.slice(0, maxSlots);
      var changed = 0;
      for(i=0; i<Math.min(values.length, textLayers.length); i++){
        try{
          var td = textLayers[i].prop.value;
          td.text = values[i];
          textLayers[i].prop.setValue(td);
          changed++;
        }catch(_e2){}
      }
      function clearPropAnimation(prop){
        if(!prop) return;
        try{
          if(prop.expressionEnabled) prop.expressionEnabled = false;
        }catch(_eExprOff){}
        try{
          for(var kk=prop.numKeys; kk>=1; kk--) prop.removeKey(kk);
        }catch(_eRm){}
      }
      function ensureBulletBlurEffect(layer){
        if(!layer) return null;
        var fx = null;
        try{ fx = layer.property("ADBE Effect Parade"); }catch(_eFx){ fx = null; }
        if(!fx) return null;
        var iFx;
        for(iFx=1; iFx<=fx.numProperties; iFx++){
          var e = fx.property(iFx);
          if(e && e.matchName === "ADBE Gaussian Blur 2") return e;
        }
        var added = null;
        try{
          added = fx.addProperty("ADBE Gaussian Blur 2");
          if(added) added.name = "MB2 Bullet Blur";
        }catch(_eAdd){ added = null; }
        return added;
      }
      function applyBulletRevealAnimation(layer, localIn, offsetX, blurStart, animDur){
        if(!layer) return;
        var tIn = (localIn === null || localIn === undefined) ? 0 : toNum(localIn, 0);
        if(tIn < 0) tIn = 0;
        var d = Math.max(0.05, toNum(animDur, 0.333));
        var tOut = tIn + d;

        try{
          var tr = layer.property("ADBE Transform Group");
          var op = tr ? tr.property("ADBE Opacity") : null;
          if(op){
            clearPropAnimation(op);
            op.setValueAtTime(tIn, 0);
            op.setValueAtTime(tOut, 100);
          }
          var pos = tr ? tr.property("ADBE Position") : null;
          if(pos){
            var base = null;
            try{ base = pos.value; }catch(_ePosVal){ base = null; }
            if(base && base.length >= 2){
              clearPropAnimation(pos);
              var start = [];
              var k;
              for(k=0; k<base.length; k++) start[k] = base[k];
              start[0] = toNum(base[0], 0) + toNum(offsetX, -30);
              pos.setValueAtTime(tIn, start);
              pos.setValueAtTime(tOut, base);
            }
          }
        }catch(_eTr){}

        try{
          var blurFx = ensureBulletBlurEffect(layer);
          var blurProp = blurFx ? blurFx.property(1) : null;
          if(blurProp){
            clearPropAnimation(blurProp);
            blurProp.setValueAtTime(tIn, Math.max(0, toNum(blurStart, 70)));
            blurProp.setValueAtTime(tOut, 0);
          }
        }catch(_eBlur){}
      }
      if(changed > bulletStartIndex && bulletCues && bulletCues.length){
        var cueStep = 0.35;
        var cueDur = toNum(clipDuration, 0);
        if(cueDur <= 0){
          try{ cueDur = toNum(instanceComp.duration, 0); }catch(_eDurCue){ cueDur = 0; }
        }
        if(cueDur > 0) cueStep = Math.max(0.25, cueDur / Math.max(2, changed + 1));
        var bulletAnimCount = Math.min(bulletCues.length, Math.max(0, textLayers.length - bulletStartIndex));
        for(i=0; i<bulletAnimCount; i++){
          var cue = bulletCues[i] || {};
          var localIn = (cue.inTime === null || cue.inTime === undefined) ? null : (toNum(cue.inTime, 0) - toNum(baseCompTime, 0));
          if(localIn !== null && localIn < 0) localIn = 0;
          if(localIn === null) localIn = i * cueStep;
          try{
            var fpsIn = 25;
            try{ fpsIn = toNum(instanceComp.frameRate, 25); }catch(_eFps){ fpsIn = 25; }
            var animIn = Math.max(0.12, 10 / Math.max(1, fpsIn));
            // Mode cumulatif: le bullet reste visible; on anime seulement l'entrée.
            applyBulletRevealAnimation(textLayers[bulletStartIndex + i].layer, localIn, -30, 70, animIn);
          }catch(_eCue){}
        }
      }else if(changed > bulletStartIndex && bulletTexts && bulletTexts.length){
        // Fallback utile: si pas de bullet_n_in/out, révélation progressive auto cumulée.
        var d = toNum(clipDuration, 0);
        if(d <= 0){
          try{ d = toNum(instanceComp.duration, 0); }catch(_eDur){ d = 0; }
        }
        if(d <= 0) d = 6;
        var step = Math.max(0.25, d / Math.max(2, changed + 1));
        var fpsAuto = 25;
        try{ fpsAuto = toNum(instanceComp.frameRate, 25); }catch(_eFps2){ fpsAuto = 25; }
        var animAuto = Math.max(0.12, 10 / Math.max(1, fpsAuto));
        var autoCount = Math.max(0, Math.min(changed - bulletStartIndex, bulletTexts.length));
        for(i=0; i<autoCount; i++){
          try{
            applyBulletRevealAnimation(textLayers[bulletStartIndex + i].layer, i * step, -30, 70, animAuto);
          }catch(_eAuto){}
        }
      }
      return changed;
    }

    function ensureCsvFootageFromPath(path, cache){
      var p = trim(path || "");
      if(!p) return null;
      if(cache[p]) return cache[p];
      var f = File(p);
      if(!f.exists) return null;
      var fi = null;
      try{ fi = new ImportOptions(f); }catch(_e1){ fi = null; }
      if(!fi) return null;
      var footage = null;
      try{ footage = app.project.importFile(fi); }catch(_e2){ footage = null; }
      if(footage) cache[p] = footage;
      return footage;
    }

    function applyCsvImageToInstance(instanceComp, imageItems, footageCache, slotLimit){
      if(!instanceComp) return 0;
      var items = imageItems instanceof Array ? imageItems : [];
      if(items.length === 0) return 0;
      function isReplaceableLayer(ly){
        try{ return !!(ly && typeof ly.replaceSource === "function"); }catch(_eRep0){ return false; }
      }
      function isExplicitImageLayer(ly){
        var nm = trim((ly && ly.name) || "").toLowerCase();
        return (nm.indexOf("[mb2_image]") >= 0) ||
          (nm.indexOf("image") >= 0) ||
          (nm.indexOf("img") >= 0) ||
          (nm.indexOf("photo") >= 0) ||
          (nm.indexOf("visuel") >= 0) ||
          (nm.indexOf("logo") >= 0) ||
          (nm.indexOf("icon") >= 0) ||
          (nm.indexOf("media") >= 0) ||
          (nm.indexOf("placeholder") >= 0);
      }
      function isReplaceableFootageLayer(ly){
        var src = null;
        var isSolid = false;
        try{ src = ly.source; }catch(_eSrc){ src = null; }
        try{ isSolid = !!(src && src.mainSource && (src.mainSource instanceof SolidSource)); }catch(_eSolid){ isSolid = false; }
        if(!src || isSolid) return false;
        try{ return typeof ly.replaceSource === "function"; }catch(_eRep){ return false; }
      }
      function collectTargetsRecursive(compItem, depth){
        var localTargets = [];
        var nestedTargets = [];
        if(!compItem || depth > 2) return localTargets;
        var i, ly, src;
        for(i=1; i<=compItem.numLayers; i++){
          ly = compItem.layer(i);
          if(isExplicitImageLayer(ly) && isReplaceableLayer(ly)) localTargets.push({ layer: ly, index: i, depth: depth });
        }
        if(localTargets.length === 0){
          for(i=1; i<=compItem.numLayers; i++){
            ly = compItem.layer(i);
            if(isReplaceableFootageLayer(ly)) localTargets.push({ layer: ly, index: i, depth: depth });
          }
        }
        if(localTargets.length > 0) return localTargets;
        for(i=1; i<=compItem.numLayers; i++){
          ly = compItem.layer(i);
          src = null;
          try{ src = ly.source; }catch(_eCompSrc){ src = null; }
          if(src && (src instanceof CompItem)){
            var nestedComp = src;
            try{
              nestedComp = src.duplicate();
              ly.replaceSource(nestedComp, false);
            }catch(_eDup){
              nestedComp = src;
            }
            var found = collectTargetsRecursive(nestedComp, depth + 1);
            for(var fi=0; fi<found.length; fi++) nestedTargets.push(found[fi]);
          }
        }
        return nestedTargets;
      }
      function fitReplacedSourceToLayer(layer, oldSource, newSource){
        if(!layer || !oldSource || !newSource) return;
        var oldW = toNum(oldSource.width, 0);
        var oldH = toNum(oldSource.height, 0);
        var newW = toNum(newSource.width, 0);
        var newH = toNum(newSource.height, 0);
        if(oldW <= 0 || oldH <= 0 || newW <= 0 || newH <= 0) return;
        try{
          var tr = layer.property("ADBE Transform Group");
          var sc = tr ? tr.property("ADBE Scale") : null;
          if(!sc) return;
          var base = sc.value;
          if(!base || base.length < 2) return;
          var cover = Math.max(oldW / newW, oldH / newH);
          var next = [];
          for(var si=0; si<base.length; si++) next[si] = base[si];
          next[0] = toNum(base[0], 100) * cover;
          next[1] = toNum(base[1], 100) * cover;
          sc.setValue(next);
        }catch(_eFit){}
      }
      var targets = collectTargetsRecursive(instanceComp, 0);
      if(targets.length === 0) return 0;
      targets.sort(function(a,b){ return a.index - b.index; });
      var maxSlots = Math.max(0, parseInt(toNum(slotLimit, targets.length), 10));
      if(maxSlots > 0 && targets.length > maxSlots) targets = targets.slice(0, maxSlots);
      var replaced = 0;
      for(var ti=0; ti<Math.min(targets.length, items.length); ti++){
        var it = items[ti];
        var p = trim(it.path || "");
        if(!p) continue;
        var footage = ensureCsvFootageFromPath(p, footageCache);
        if(!footage) continue;
        var oldSource = null;
        try{ oldSource = targets[ti].layer.source; }catch(_eOldSrc){ oldSource = null; }
        try{
          targets[ti].layer.replaceSource(footage, false);
          fitReplacedSourceToLayer(targets[ti].layer, oldSource, footage);
          replaced++;
        }catch(_e4){}
      }
      return replaced;
    }

    function buildCsvLogText(report, stats, modeLabel){
      var lines = [];
      lines.push("Marker Builder 2 - Rapport CSV");
      lines.push("Date: " + (new Date()).toString());
      lines.push("Mode: " + modeLabel);
      lines.push("");
      lines.push("Source");
      lines.push("- Lignes source: " + (report.meta ? report.meta.rowsTotal : report.jobs.length));
      lines.push("- Lignes valides: " + report.jobs.length);
      lines.push("- Erreurs source: " + report.errors.length);
      lines.push("- Warnings source: " + report.warnings.length);
      if(stats){
        lines.push("- Crees: " + stats.created);
        lines.push("- Echecs execution: " + stats.failed);
        lines.push("- Textes injectes: " + stats.textInjected);
        lines.push("- Images injectees: " + stats.imageInjected);
      }
      lines.push("");
      if(report.errors.length){
        lines.push("Erreurs source");
        for(var i=0; i<report.errors.length; i++) lines.push("- " + report.errors[i]);
        lines.push("");
      }
      if(report.warnings.length){
        lines.push("Warnings source");
        for(var w=0; w<report.warnings.length; w++) lines.push("- " + report.warnings[w]);
        lines.push("");
      }
      if(stats && stats.details && stats.details.length){
        lines.push("Execution detaillee");
        for(var d=0; d<stats.details.length; d++) lines.push("- " + stats.details[d]);
      }
      return lines.join("\n");
    }

    function saveCsvLogDialog(report, stats, modeLabel){
      var f = File.saveDialog("Enregistrer le rapport CSV", "*.txt");
      if(!f) return false;
      try{
        f.encoding = "UTF-8";
        if(!f.open("w")) throw new Error("Ouverture ecriture impossible");
        f.write(buildCsvLogText(report, stats, modeLabel || "run"));
        f.close();
        return true;
      }catch(e){
        try{ f.close(); }catch(_e){}
        alert("Erreur export rapport CSV: " + e.toString());
        return false;
      }
    }

    function executeCsvReport(report, comp){
      var stats = { created: 0, failed: 0, textInjected: 0, imageInjected: 0, details: [] };
      var footageCache = {};
      var progressWin = null;
      var progressBar = null;
      var progressTxt = null;
      function shouldRefreshProgress(i, total){
        if(total <= 30) return true;
        if(i === 0 || i === total - 1) return true;
        return (i % 5) === 0;
      }
      if(report.jobs.length > 0){
        try{
          progressWin = new Window("palette", "MB2 - Exécution CSV");
          progressWin.orientation = "column";
          progressWin.alignChildren = ["fill", "top"];
          progressWin.margins = 10;
          progressTxt = progressWin.add("statictext", undefined, "Préparation...");
          progressTxt.characters = 48;
          progressBar = progressWin.add("progressbar", undefined, 0, report.jobs.length);
          progressBar.preferredSize = [360, 16];
          progressWin.show();
        }catch(_eProgress){
          progressWin = null; progressBar = null; progressTxt = null;
        }
      }
      ensurePlacementRuntimeCache(comp);
      app.beginUndoGroup("MB2 CSV Import");
      try{
        for(var j=0; j<report.jobs.length; j++){
          var job = report.jobs[j];
          if(progressBar && shouldRefreshProgress(j, report.jobs.length)){
            try{
              progressBar.value = j;
              progressTxt.text = "Ligne " + job.line + " (" + (j + 1) + "/" + report.jobs.length + ")";
              progressWin.update();
            }catch(_eProgUp){}
          }
          var ok = false;
          var out = {};
          try{
            ok = placePresetAtTime(comp, job.preset, job.time, out);
            if(ok && out.instanceComp){
              var tx = applyCsvTextToInstance(out.instanceComp, job.text, job.bullets, job.textList, job.preset ? job.preset.textSlots : 0, job.bulletCues, job.time, (job.preset ? job.preset.dur : 0));
              var im = applyCsvImageToInstance(out.instanceComp, job.imagePaths, footageCache, job.preset ? job.preset.imageSlots : 0);
              stats.textInjected += tx;
              stats.imageInjected += im;
              stats.details.push("Ligne " + job.line + ": OK (texte=" + tx + ", image=" + im + ")");
            }else if(ok){
              stats.details.push("Ligne " + job.line + ": OK");
            }
          }catch(_eCsv){
            ok = false;
            stats.details.push("Ligne " + job.line + ": ECHEC execution");
          }
          if(ok) stats.created++; else stats.failed++;
        }
        setStatus("📄 CSV import terminé. Créés: " + stats.created + ", échecs: " + stats.failed + ", erreurs source: " + report.errors.length);
      }finally{
        app.endUndoGroup();
        clearPlacementRuntimeCache();
        if(progressBar){
          try{
            progressBar.value = report.jobs.length;
            progressTxt.text = "Terminé (" + report.jobs.length + "/" + report.jobs.length + ")";
            progressWin.update();
            progressWin.close();
          }catch(_eProgClose){}
        }
      }
      var rep = "Import CSV terminé.\nCréés: " + stats.created + "\nÉchecs: " + stats.failed + "\nErreurs source: " + report.errors.length + "\nWarnings: " + report.warnings.length + "\nTextes injectés: " + stats.textInjected + "\nImages injectées: " + stats.imageInjected;
      if(stats.created === 0){
        rep += "\n\nAucun élément créé. Vérifie: template/preset/timecode et la comp active.";
      }
      alert(rep);
      return stats;
    }

    function runCsvWizard(parsed, comp, sourceName){
      var headers = parsed.headers || [];
      var autoMap = detectCsvMapping(headers);
      var map = parseJSON(stringifyJSON(autoMap));
      var strictBlueprintMode = true;
      var report = validateCsvRows(parsed, comp, map, { strictBlueprint: strictBlueprintMode });

      function cropCell(v){
        var s = trim(v || "");
        if(s.length > 24) s = s.substring(0, 21) + "...";
        return s;
      }
      function buildCsvPreviewText(parsedData, maxRows){
        var out = [];
        var hs = parsedData.headers || [];
        var rs = parsedData.rows || [];
        var maxCols = 12;
        var shownHeaders = hs.slice(0, Math.min(hs.length, maxCols));
        var n = Math.min(rs.length, maxRows || 8);
        out.push("Aperçu CSV (premières lignes):");
        if(!hs.length){
          out.push("(Aucune colonne détectée)");
          return out.join("\n");
        }
        out.push(shownHeaders.join(" | "));
        if(hs.length > shownHeaders.length) out.push("(+" + (hs.length - shownHeaders.length) + " colonnes masquées)");
        out.push("----------------------------------------");
        for(var i=0; i<n; i++){
          var row = rs[i];
          var cells = [];
          for(var j=0; j<shownHeaders.length; j++) cells.push(cropCell(row[shownHeaders[j]]));
          out.push("L" + (row.__line || (i + 2)) + " : " + cells.join(" | "));
        }
        if(rs.length > n) out.push("... (" + (rs.length - n) + " ligne(s) supplémentaire(s))");
        return out.join("\n");
      }

      var dlg = new Window("dialog", "CSV - Assistant import (4 étapes)", undefined, { resizeable: true });
      dlg.orientation = "column";
      dlg.alignChildren = ["fill", "top"];
      dlg.margins = 10;
      dlg.spacing = 8;
      dlg.minimumSize = [640, 500];

      var stepTitle = dlg.add("statictext", undefined, "Étape 1/4 - Source");
      var stack = dlg.add("group");
      stack.orientation = "stack";
      stack.preferredSize = [680, 460];
      stack.minimumSize = [620, 400];
      stack.alignChildren = ["fill", "fill"];

      var p1 = stack.add("panel", undefined, "1) Source CSV");
      p1.orientation = "column";
      p1.alignChildren = ["fill", "top"];
      var p1Guide = p1.add("statictext", undefined, "Tutoriel: vérifie ici que le bon fichier CSV est chargé (nom, colonnes, nombre de lignes), puis clique sur 'Suivant'.", { multiline: true });
      p1Guide.characters = 98;
      var s1 = "Fichier: " + (sourceName || "(inconnu)") + "\n";
      s1 += "Colonnes détectées: " + headers.length + "\n";
      s1 += "Lignes détectées: " + parsed.rows.length + "\n\n";
      var colsPreview = headers.slice(0, Math.min(headers.length, 16));
      s1 += "Colonnes (aperçu):\n" + (colsPreview.length ? ("- " + colsPreview.join("\n- ")) : "(aucune)");
      if(headers.length > colsPreview.length) s1 += "\n... (+" + (headers.length - colsPreview.length) + " colonnes)";
      var p1Txt = p1.add("edittext", undefined, s1, { multiline: true, readonly: true });
      p1Txt.minimumSize = [600, 120];
      var p1Preview = p1.add("edittext", undefined, buildCsvPreviewText(parsed, 8), { multiline: true, readonly: true });
      p1Preview.minimumSize = [600, 220];
      p1Preview.helpTip = "Visualisateur CSV: aperçu des premières lignes pour vérifier rapidement les données.";
      var p1Btns = p1.add("group");
      p1Btns.orientation = "row";
      var p1Next = p1Btns.add("button", undefined, "Suivant >");
      var p1Cancel = p1Btns.add("button", undefined, "Annuler");

      var p2 = stack.add("panel", undefined, "2) Mapping colonnes");
      p2.orientation = "column";
      p2.alignChildren = ["fill", "top"];
      var p2Guide = p2.add("statictext", undefined, "Tutoriel: associe chaque champ important à la bonne colonne CSV. IN et Template sont obligatoires. OUT est optionnel (si présent, il définit la durée).", { multiline: true });
      p2Guide.characters = 98;
      var p2Hint = p2.add("statictext", undefined, "Ajuste le mapping. '(auto)' utilise la détection intelligente.");
      p2Hint.helpTip = "Associe manuellement une colonne CSV à un champ plugin.";
      var p2Strict = p2.add("checkbox", undefined, "Mode strict Blueprint (recommandé)");
      p2Strict.value = true;
      p2Strict.helpTip = "Empêche l'utilisation de presets/templates hors Blueprint et bloque les incohérences.";
      var p2Rows = p2.add("group");
      p2Rows.orientation = "column";
      p2Rows.alignChildren = ["fill", "top"];

      var mapFields = [
        { key: "time_in", label: "Timecode IN (obligatoire)" },
        { key: "time_out", label: "Timecode OUT (optionnel)" },
        { key: "timecode", label: "Timecode (fallback)" },
        { key: "template", label: "Template (obligatoire)" },
        { key: "text", label: "Texte" },
        { key: "image", label: "Image" },
        { key: "image_key", label: "Image key (base interne)" },
        { key: "bullets", label: "Bullets (séparés par |)" },
        { key: "preset", label: "Preset" },
        { key: "category", label: "Catégorie" },
        { key: "text_slots", label: "Text slots" },
        { key: "image_slots", label: "Image slots" },
        { key: "dur", label: "Durée" },
        { key: "fade", label: "Fade" },
        { key: "x", label: "Move X" },
        { key: "y", label: "Move Y" },
        { key: "spawn_anchor", label: "Apparition (ancre)" },
        { key: "spawn_x", label: "Apparition X" },
        { key: "spawn_y", label: "Apparition Y" },
        { key: "blur", label: "Flou" }
      ];
      var mapCtrls = {};
      function addMapRow(field){
        var r = p2Rows.add("group");
        r.orientation = "row";
        r.alignChildren = ["left", "center"];
        var st = r.add("statictext", undefined, field.label);
        st.characters = 28;
        var dd = r.add("dropdownlist", undefined, ["(auto)"].concat(headers));
        dd.preferredSize = [280, 24];
        dd.selection = 0;
        if(autoMap[field.key]){
          for(var i=1; i<dd.items.length; i++){
            if(dd.items[i].text === autoMap[field.key]){ dd.selection = i; break; }
          }
        }
        mapCtrls[field.key] = dd;
      }
      for(var mf=0; mf<mapFields.length; mf++) addMapRow(mapFields[mf]);
      var p2Btns = p2.add("group");
      p2Btns.orientation = "row";
      var p2Back = p2Btns.add("button", undefined, "< Retour");
      var p2Next = p2Btns.add("button", undefined, "Suivant >");
      var p2Cancel = p2Btns.add("button", undefined, "Annuler");

      function collectMap(){
        var out = {};
        for(var i=0; i<mapFields.length; i++){
          var f = mapFields[i];
          var dd = mapCtrls[f.key];
          out[f.key] = (dd && dd.selection && dd.selection.index > 0) ? dd.selection.text : "";
        }
        return out;
      }

      var p3 = stack.add("panel", undefined, "3) Vérification");
      p3.orientation = "column";
      p3.alignChildren = ["fill", "top"];
      var p3Guide = p3.add("statictext", undefined, "Tutoriel: lis le diagnostic (valides, erreurs, warnings). Corrige le mapping si besoin jusqu'à obtenir le résultat attendu.", { multiline: true });
      p3Guide.characters = 98;
      var p3Txt = p3.add("edittext", undefined, "", { multiline: true, readonly: true });
      p3Txt.minimumSize = [600, 320];
      var p3Btns = p3.add("group");
      p3Btns.orientation = "row";
      var p3Back = p3Btns.add("button", undefined, "< Retour");
      var p3Refresh = p3Btns.add("button", undefined, "↻ Re-vérifier");
      var p3Next = p3Btns.add("button", undefined, "Suivant >");
      var p3Cancel = p3Btns.add("button", undefined, "Annuler");

      var p4 = stack.add("panel", undefined, "4) Exécution");
      p4.orientation = "column";
      p4.alignChildren = ["fill", "top"];
      var p4Guide = p4.add("statictext", undefined, "Tutoriel: lance d'abord 'Dry-run' pour simuler sans modifier le projet. Si tout est correct, clique sur 'Exécuter'.", { multiline: true });
      p4Guide.characters = 98;
      var p4Txt = p4.add("edittext", undefined, "", { multiline: true, readonly: true });
      p4Txt.minimumSize = [600, 320];
      var p4Btns = p4.add("group");
      p4Btns.orientation = "row";
      var p4Back = p4Btns.add("button", undefined, "< Retour");
      var p4Dry = p4Btns.add("button", undefined, "Dry-run");
      var p4Run = p4Btns.add("button", undefined, "Exécuter");
      var p4Log = p4Btns.add("button", undefined, "💾 Rapport");
      var p4Cancel = p4Btns.add("button", undefined, "Annuler");

      function refreshVerification(){
        map = collectMap();
        strictBlueprintMode = !!p2Strict.value;
        report = validateCsvRows(parsed, comp, map, { strictBlueprint: strictBlueprintMode });
        p3Txt.text = csvReportSummary(report, comp);
      }
      function refreshExecutionSummary(){
        var m = "Prêt à lancer l'import.\n\n";
        m += csvReportSummary(report, comp);
        m += "\nActions:\n- Dry-run: aucune création\n- Exécuter: crée les lignes valides";
        p4Txt.text = m;
        p4Run.enabled = report.jobs.length > 0;
      }
      function setStep(n){
        p1.visible = (n === 1);
        p2.visible = (n === 2);
        p3.visible = (n === 3);
        p4.visible = (n === 4);
        stepTitle.text = "Étape " + n + "/4 - " + (n === 1 ? "Source" : (n === 2 ? "Mapping" : (n === 3 ? "Vérification" : "Exécution")));
        dlg.layout.layout(true);
      }
      dlg.onResizing = dlg.onResize = function(){ this.layout.resize(); };

      p1Next.onClick = function(){ setStep(2); };
      p1Cancel.onClick = function(){ dlg.close(); };

      p2Back.onClick = function(){ setStep(1); };
      p2Next.onClick = function(){ refreshVerification(); setStep(3); };
      p2Cancel.onClick = function(){ dlg.close(); };

      p3Back.onClick = function(){ setStep(2); };
      p3Refresh.onClick = function(){ refreshVerification(); };
      p3Next.onClick = function(){ refreshVerification(); refreshExecutionSummary(); setStep(4); };
      p3Cancel.onClick = function(){ dlg.close(); };

      p4Back.onClick = function(){ setStep(3); };
      p4Dry.onClick = function(){
        setStatus("📄 Dry-run CSV terminé. Valides: " + report.jobs.length + ", erreurs: " + report.errors.length);
        alert("Dry-run CSV terminé.\nValides: " + report.jobs.length + "\nErreurs: " + report.errors.length + "\nWarnings: " + report.warnings.length);
        if(confirm("Exporter le rapport dry-run en .txt ?")) saveCsvLogDialog(report, null, "dry-run");
        refreshExecutionSummary();
      };
      p4Run.onClick = function(){
        var stats = executeCsvReport(report, comp);
        if(confirm("Exporter le rapport d'exécution en .txt ?")) saveCsvLogDialog(report, stats, "run");
        refreshVerification();
        refreshExecutionSummary();
      };
      p4Log.onClick = function(){ saveCsvLogDialog(report, null, "verification"); };
      p4Cancel.onClick = function(){ dlg.close(); };

      setStep(1);
      dlg.show();
    }

    function runCsvImport(){
      var comp = activeComp();
      if(!comp){ alert("Ouvre une composition active avant l'import CSV."); return; }
      var f = File.openDialog("Importer un CSV", "*.csv");
      if(!f) return;
      try{
        f.encoding = "UTF-8";
        if(!f.open("r")) throw new Error("Ouverture lecture impossible.");
        var raw = f.read();
        f.close();
        var parsed = parseCSVRaw(raw);
        if(parsed.rows.length === 0){
          alert("CSV vide.");
          return;
        }
        runCsvWizard(parsed, comp, f.name);
      }catch(e){
        try{ f.close(); }catch(_e){}
        alert("Erreur import CSV: " + e.toString());
      }
    }
    function runCsvDirectImport(forceCheckAll){
      var comp = activeComp();
      if(!comp){ alert("Ouvre une composition active avant l'import CSV."); return; }
      var f = File.openDialog("CSV direct - choisir un CSV", "*.csv");
      if(!f) return;
      try{
        f.encoding = "UTF-8";
        if(!f.open("r")) throw new Error("Ouverture lecture impossible.");
        var raw = f.read();
        f.close();
        var parsed = parseCSVRaw(raw);
        if(parsed.rows.length === 0){ alert("CSV vide."); return; }
        var checkAll = (forceCheckAll === true);
        if(forceCheckAll !== true){
          checkAll = confirm("CSV direct:\nOui = check complet avant exécution\nNon = exécuter rapidement (lignes invalides ignorées).");
        }
        var map = detectCsvMapping(parsed.headers || []);
        var report = validateCsvRows(parsed, comp, map, { strictBlueprint: true });
        if(checkAll && report.errors.length > 0){
          alert("Check complet: erreurs détectées, exécution bloquée.\nErreurs: " + report.errors.length + "\nWarnings: " + report.warnings.length);
          if(confirm("Exporter le rapport de vérification ?")) saveCsvLogDialog(report, null, "verification");
          return;
        }
        if(!checkAll && report.errors.length > 0){
          if(!confirm("CSV direct: " + report.errors.length + " ligne(s) invalide(s) seront ignorées.\nContinuer avec " + report.jobs.length + " ligne(s) valide(s) ?")) return;
        }
        if(report.jobs.length === 0){
          alert("Aucune ligne valide à exécuter.");
          return;
        }
        var stats = executeCsvReport(report, comp);
        if(confirm("Exporter le rapport d'exécution en .txt ?")) saveCsvLogDialog(report, stats, "run-direct");
      }catch(e){
        try{ f.close(); }catch(_e){}
        alert("Erreur CSV direct: " + e.toString());
      }
    }
    function openGridLayoutWindow(){
      if(gridLayoutWin){
        try{ gridLayoutWin.show(); gridLayoutWin.active = true; }catch(_eShow){}
        return;
      }
      var cfg = loadGridLayoutConfig();
      var lastPreviewSig = "";
      var lastPreviewCompId = -1;
      function gridProfile(name){
        var n = trim(name || "").toLowerCase();
        if(n === "review"){
          return sanitizeGridLayoutConfig({ xPct:0.52, yPct:0.10, wPct:0.40, hPct:0.78, cols:5, rows:7 });
        }
        if(n === "fullscreen_heavy"){
          return sanitizeGridLayoutConfig({ xPct:0.56, yPct:0.14, wPct:0.36, hPct:0.68, cols:4, rows:6 });
        }
        return sanitizeGridLayoutConfig({ xPct:0.50, yPct:0.09, wPct:0.43, hPct:0.82, cols:6, rows:8 });
      }
      function fieldsToConfig(){
        return sanitizeGridLayoutConfig({
          xPct: toNum(eX.text, cfg.xPct),
          yPct: toNum(eY.text, cfg.yPct),
          wPct: toNum(eW.text, cfg.wPct),
          hPct: toNum(eH.text, cfg.hPct),
          cols: parseInt(eCols.text, 10),
          rows: parseInt(eRows.text, 10)
        });
      }
      function refreshLivePreview(){
        if(!chkLive.value) return;
        var comp = activeComp();
        if(!comp) return;
        var nextCfg = fieldsToConfig();
        var compId = -1;
        try{ compId = comp.id; }catch(_eCompId){ compId = -1; }
        var nextSig = [
          compId,
          nextCfg.xPct, nextCfg.yPct, nextCfg.wPct, nextCfg.hPct,
          nextCfg.cols, nextCfg.rows,
          "centers=1"
        ].join("|");
        if(nextSig === lastPreviewSig && compId === lastPreviewCompId) return;
        app.beginUndoGroup("MB2 Grid Live Preview");
        try{
          removeGridPreviewLayers(comp);
          addGridPreviewLayers(comp, nextCfg, true);
          lastPreviewSig = nextSig;
          lastPreviewCompId = compId;
        }finally{
          app.endUndoGroup();
        }
      }
      gridLayoutWin = new Window("palette", "Zone grille anti-overlap (droite)", undefined, { resizeable: true });
      var w = gridLayoutWin;
      w.orientation = "column";
      w.alignChildren = ["fill", "top"];
      w.margins = 10;
      w.spacing = 8;

      var help = w.add("statictext", undefined, "Fenêtre non bloquante. Ajuste X/Y/W/H et regarde la comp avec l'aperçu live.", { multiline: true });
      help.characters = 68;

      var row1 = w.add("group"); row1.orientation = "row";
      row1.add("statictext", undefined, "X");
      var eX = row1.add("edittext", undefined, String(cfg.xPct)); eX.characters = 8;
      row1.add("statictext", undefined, "Y");
      var eY = row1.add("edittext", undefined, String(cfg.yPct)); eY.characters = 8;
      row1.add("statictext", undefined, "W");
      var eW = row1.add("edittext", undefined, String(cfg.wPct)); eW.characters = 8;
      row1.add("statictext", undefined, "H");
      var eH = row1.add("edittext", undefined, String(cfg.hPct)); eH.characters = 8;

      var row2 = w.add("group"); row2.orientation = "row";
      row2.add("statictext", undefined, "Colonnes");
      var eCols = row2.add("edittext", undefined, String(cfg.cols)); eCols.characters = 6;
      row2.add("statictext", undefined, "Lignes");
      var eRows = row2.add("edittext", undefined, String(cfg.rows)); eRows.characters = 6;

      var rowProfile = w.add("group"); rowProfile.orientation = "row";
      rowProfile.add("statictext", undefined, "Profils");
      var bProfilFormation = rowProfile.add("button", undefined, "Formation");
      var bProfilReview = rowProfile.add("button", undefined, "Review");
      var bProfilFsHeavy = rowProfile.add("button", undefined, "Fullscreen heavy");
      function applyProfileFields(p){
        eX.text = String(p.xPct); eY.text = String(p.yPct); eW.text = String(p.wPct); eH.text = String(p.hPct);
        eCols.text = String(p.cols); eRows.text = String(p.rows);
      }
      bProfilFormation.onClick = function(){ applyProfileFields(gridProfile("formation")); };
      bProfilReview.onClick = function(){ applyProfileFields(gridProfile("review")); };
      bProfilFsHeavy.onClick = function(){ applyProfileFields(gridProfile("fullscreen_heavy")); };

      var rowLive = w.add("group"); rowLive.orientation = "row";
      var chkLive = rowLive.add("checkbox", undefined, "Aperçu live");
      chkLive.value = true;
      var bPreviewNow = rowLive.add("button", undefined, "Actualiser aperçu");
      var bHidePreview = rowLive.add("button", undefined, "Masquer aperçu");

      var bRow = w.add("group"); bRow.orientation = "row"; bRow.alignment = "right";
      var bReset = bRow.add("button", undefined, "Reset");
      var bSave = bRow.add("button", undefined, "Appliquer + sauver");
      var bClose = bRow.add("button", undefined, "Fermer");

      bReset.onClick = function(){
        var d = defaultGridLayoutConfig();
        eX.text = String(d.xPct); eY.text = String(d.yPct); eW.text = String(d.wPct); eH.text = String(d.hPct);
        eCols.text = String(d.cols); eRows.text = String(d.rows);
        refreshLivePreview();
      };
      bPreviewNow.onClick = function(){ refreshLivePreview(); };
      bHidePreview.onClick = function(){
        var comp = activeComp();
        if(!comp) return;
        app.beginUndoGroup("MB2 Hide Grid Preview");
        try{
          removeGridPreviewLayers(comp);
          lastPreviewSig = "";
          lastPreviewCompId = -1;
        }finally{ app.endUndoGroup(); }
      };
      bSave.onClick = function(){
        var next = fieldsToConfig();
        saveGridLayoutConfig(next);
        setStatus("🧭 Zone grille mise à jour (X=" + next.xPct + ", Y=" + next.yPct + ", W=" + next.wPct + ", H=" + next.hPct + ", C=" + next.cols + ", R=" + next.rows + ")");
        refreshLivePreview();
      };
      bClose.onClick = function(){ 
        try{ w.close(); }catch(_eClose){}
      };
      function bindLiveEdit(ed){
        ed.onChanging = function(){ refreshLivePreview(); };
        ed.onChange = function(){ refreshLivePreview(); };
      }
      bindLiveEdit(eX); bindLiveEdit(eY); bindLiveEdit(eW); bindLiveEdit(eH); bindLiveEdit(eCols); bindLiveEdit(eRows);
      var oldApplyProfileFields = applyProfileFields;
      applyProfileFields = function(p){
        oldApplyProfileFields(p);
        refreshLivePreview();
      };
      w.onClose = function(){
        gridLayoutWin = null;
        lastPreviewSig = "";
        lastPreviewCompId = -1;
        return true;
      };
      w.layout.layout(true);
      w.show();
      refreshLivePreview();
    }
    function removeGridPreviewLayers(comp){
      var removed = 0;
      if(!comp) return removed;
      for(var i=comp.numLayers; i>=1; i--){
        var ly = comp.layer(i);
        var c = "";
        try{ c = trim(ly.comment || ""); }catch(_eC){}
        if(c.indexOf(TAG_GRID_GUIDE) === 0){
          try{ ly.remove(); removed++; }catch(_eRm){}
        }
      }
      return removed;
    }
    function addGridPreviewLayers(comp, cfgOverride, showCenters){
      if(!comp) return 0;
      var cfg = cfgOverride ? sanitizeGridLayoutConfig(cfgOverride) : loadGridLayoutConfig();
      cfg = {
        cols: cfg.cols,
        rows: cfg.rows,
        cellW: (comp.width * cfg.wPct) / cfg.cols,
        cellH: (comp.height * cfg.hPct) / cfg.rows,
        originX: comp.width * cfg.xPct,
        originY: comp.height * cfg.yPct
      };
      var created = 0;
      var areaW = Math.max(2, Math.round(cfg.cellW * cfg.cols));
      var areaH = Math.max(2, Math.round(cfg.cellH * cfg.rows));
      var centerX = cfg.originX + (areaW * 0.5);
      var centerY = cfg.originY + (areaH * 0.5);
      function makeGuide(name, w, h, x, y, opacity, color){
        var ly = null;
        try{
          ly = comp.layers.addSolid(color || [0.12, 0.75, 1.0], name, Math.max(1, Math.round(w)), Math.max(1, Math.round(h)), 1, Math.max(1, toNum(comp.duration, 10)));
          ly.inPoint = 0;
          ly.outPoint = Math.max(1, toNum(comp.duration, 10));
          ly.startTime = 0;
          ly.guideLayer = true;
          ly.locked = true;
          ly.shy = true;
          ly.comment = TAG_GRID_GUIDE + " name=" + name;
          ly.property("ADBE Transform Group").property("ADBE Position").setValue([x, y]);
          ly.property("ADBE Transform Group").property("ADBE Opacity").setValue(toNum(opacity, 25));
          created++;
        }catch(_eMk){}
        return ly;
      }
      makeGuide("MB2_GRID_FRAME", areaW, areaH, centerX, centerY, 22, [0.10, 0.70, 1.0]);
      for(var c=1; c<cfg.cols; c++){
        var x = cfg.originX + (cfg.cellW * c);
        makeGuide("MB2_GRID_V" + c, 2, areaH, x, centerY, 28, [0.20, 0.95, 1.0]);
      }
      for(var r=1; r<cfg.rows; r++){
        var y = cfg.originY + (cfg.cellH * r);
        makeGuide("MB2_GRID_H" + r, areaW, 2, centerX, y, 28, [0.20, 0.95, 1.0]);
      }
      if(showCenters){
        var centerStepX = (cfg.cols <= 4) ? 1 : 2;
        var centerStepY = (cfg.rows <= 4) ? 1 : 2;
        for(var gy=0; gy<cfg.rows; gy += centerStepY){
          for(var gx=0; gx<cfg.cols; gx += centerStepX){
            var cx = cfg.originX + ((gx + 0.5) * cfg.cellW);
            var cy = cfg.originY + ((gy + 0.5) * cfg.cellH);
            makeGuide("MB2_GRID_C_" + gx + "_" + gy, 10, 10, cx, cy, 42, [1.0, 0.45, 0.15]);
          }
        }
      }
      return created;
    }
    function toggleGridPreview(){
      var comp = activeComp();
      if(!comp){ alert("Ouvre une composition active."); return; }
      app.beginUndoGroup("MB2 Grid Preview");
      try{
        var removed = removeGridPreviewLayers(comp);
        if(removed > 0){
          setStatus("👁 Aperçu grille désactivé");
          return;
        }
        var created = addGridPreviewLayers(comp);
        setStatus("👁 Aperçu grille activé (" + created + " guide(s))");
      }finally{
        app.endUndoGroup();
      }
    }

    function openSettingsWindow(){
      var settingsWin = new Window("dialog", "Outils - Marker Builder 2");
      settingsWin.orientation = "column";
      settingsWin.alignChildren = ["fill", "top"];
      settingsWin.margins = 10;
      settingsWin.spacing = 8;

      var pLib = settingsWin.add("panel", undefined, "Bibliothèque presets");
      pLib.orientation = "column";
      pLib.alignChildren = ["fill", "top"];
      var sExport = pLib.add("button", undefined, "💾 Export presets");
      var sImport = pLib.add("button", undefined, "📥 Import presets");
      var sSchema = pLib.add("button", undefined, "🧾 Export Blueprint MB");
      var sAgent = pLib.add("button", undefined, "🤖 Export Agent");

      var pCsv = settingsWin.add("panel", undefined, "Import CSV");
      pCsv.orientation = "column";
      pCsv.alignChildren = ["fill", "top"];
      var sCSV = pCsv.add("button", undefined, "📄 Import CSV");
      var sMedia = pCsv.add("button", undefined, "🖼 Base médias");

      var pMaint = settingsWin.add("panel", undefined, "Maintenance");
      pMaint.orientation = "column";
      pMaint.alignChildren = ["fill", "top"];
      var sStackAnchor = pMaint.add("button", undefined, "⚓ Ancre pile");
      var sReset = pMaint.add("button", undefined, "♻ Réinitialiser bibliothèque");
      var sHistory = pMaint.add("button", undefined, "📜 Historique");

      var buttons = [sExport, sImport, sSchema, sAgent, sCSV, sMedia, sStackAnchor, sReset, sHistory];
      for(var bi=0; bi<buttons.length; bi++){
        buttons[bi].minimumSize = [170, 28];
        buttons[bi].alignment = ["fill", "top"];
      }

      var sClose = settingsWin.add("button", undefined, "Fermer");

      sExport.onClick = function(){ exportPresets(); };
      sImport.onClick = function(){ importPresets(); };
      sSchema.onClick = function(){ exportBlueprintMBCSV(); };
      sAgent.onClick = function(){ exportAgentPack(); };
      sCSV.onClick = function(){ runCsvImport(); };
      sMedia.onClick = function(){ openMediaDbWindow(); };
      sStackAnchor.onClick = function(){ createOrSelectStackAnchorAction(); };
      sReset.onClick = function(){ resetPresetLibraryWithBackup(); };
      sHistory.onClick = function(){
        var msg = history.length ? history.join("\n") : "Aucune action enregistree.";
        alert("Historique (10 max):\n\n" + msg);
      };
      sClose.onClick = function(){ settingsWin.close(); };
      wrapHandler(sExport, "onClick", "param-export");
      wrapHandler(sImport, "onClick", "param-import");
      wrapHandler(sSchema, "onClick", "param-schema");
      wrapHandler(sAgent, "onClick", "param-agent-pack");
      wrapHandler(sCSV, "onClick", "param-csv");
      wrapHandler(sMedia, "onClick", "param-media");
      wrapHandler(sStackAnchor, "onClick", "param-stack-anchor");
      wrapHandler(sReset, "onClick", "param-reset");
      wrapHandler(sHistory, "onClick", "param-historique");
      wrapHandler(sClose, "onClick", "param-fermer");
      settingsWin.layout.layout(true);
      settingsWin.show();
    }

    function openTemplateAuditAction(templateName){
      var tpl = trim(templateName || "");
      if(!tpl){
        alert("Choisis d'abord un template.");
        return;
      }
      alert(buildTemplateAuditText(auditTemplateContract(tpl)));
    }

    function renderCategoryContent(){
      try{
      dbg("renderCategoryContent enter selected=" + db.selectedCategory + " tabs=" + catTabs.children.length);
      if(catTabs.children.length === 0){
        db = sanitizeDB(db);
        rebuildCategoryTabs();
        if(catTabs.children.length === 0){
          setStatus("⚠ Impossible de reconstruire les catégories.");
          return;
        }
      }
      db.selectedCategory = Math.max(0, Math.min(db.selectedCategory, catTabs.children.length - 1));
      selectTabByIndex(catTabs, db.selectedCategory);
      removeChildren(contentHost);

      var cat = getCurrentCategory();
      dbg("renderCategoryContent cat=" + (cat ? cat.name : "null") + " presets=" + (cat && cat.presets ? cat.presets.length : -1));
      var selectedPreset = null;
      var displayedPresetIds = [];
      var isLoadingPreset = false;
      var modelAutoAssigned = false;

      var main = contentHost.add("group");
      main.orientation = "row";
      main.alignChildren = ["fill", "top"];
      main.spacing = 8;
      main.margins = 8;
      main.alignment = ["fill", "top"];

      var left = main.add("group");
      left.orientation = "column";
      left.alignChildren = ["fill", "top"];
      left.minimumSize = [220, 220];
      left.alignment = ["fill", "top"];

      var rowAction = left.add("group");
      rowAction.orientation = "row";
      var btnMarker = rowAction.add("button", undefined, "📍 Marqueur seul");
      var btnPlace = rowAction.add("button", undefined, "🎬 Poser maintenant");
      var btnApplyAllInline = rowAction.add("button", undefined, "⚡ Appliquer tout");
      var btnCleanMkInline = rowAction.add("button", undefined, "🧹 Marqueurs");
      var btnCleanAutoInline = rowAction.add("button", undefined, "🧽 AUTO");
      btnMarker.helpTip = "Pose uniquement un marqueur plugin au curseur temporel.";
      btnPlace.helpTip = "Crée directement l'élément à partir du preset sélectionné.";
      btnApplyAllInline.helpTip = "Applique tous les marqueurs plugin détectés.";
      btnCleanMkInline.helpTip = "Supprime les marqueurs plugin de la composition active.";
      btnCleanAutoInline.helpTip = "Supprime les calques AUTO créés par ce plugin.";
      function applyCompactModeLocal(){
        var compact = !!uiCompactMode;
        btnApplyAllInline.visible = !compact;
        btnCleanMkInline.visible = !compact;
        btnCleanAutoInline.visible = !compact;
      }

      var rowPreset = left.add("group");
      rowPreset.orientation = "row";
      var btnAddPreset = rowPreset.add("button", undefined, "➕");
      var btnDupPreset = rowPreset.add("button", undefined, "🧬");
      var btnDelPreset = rowPreset.add("button", undefined, "🗑");
      var btnFavPreset = rowPreset.add("button", undefined, "⭐");
      var btnToggleEditor = rowPreset.add("button", undefined, "🛠");
      btnAddPreset.helpTip = "Ajouter un preset à la catégorie active.";
      btnDupPreset.helpTip = "Dupliquer le preset sélectionné.";
      btnDelPreset.helpTip = "Supprimer le preset sélectionné.";
      btnFavPreset.helpTip = "Ajouter/retirer ce preset des favoris.";
      btnToggleEditor.helpTip = "Ouvrir l'éditeur preset en fenêtre popup.";

      var lb = left.add("listbox", undefined, [], { multiselect: false });
      lb.minimumSize = [220, 140];
      lb.alignment = ["fill", "top"];
      lb.helpTip = "Liste des presets (filtrée par recherche/favoris).";

      var right = main.add("panel", undefined, "🛠 Éditeur preset");
      right.orientation = "column";
      right.alignChildren = ["fill", "top"];
      right.minimumSize = [280, 220];
      right.alignment = ["fill", "top"];
      var editorVisible = false;
      var editorMinW = 280;
      function setEditorVisible(show, skipRelayout){
        editorVisible = !!show;
        right.visible = editorVisible;
        if(editorVisible){
          right.minimumSize = [editorMinW, 220];
          right.maximumSize = [10000, 10000];
        }else{
          right.minimumSize = [0, 0];
          right.maximumSize = [0, 0];
        }
        btnToggleEditor.text = "🛠";
        if(!skipRelayout) safeRelayout();
      }

      var lblName = right.add("statictext", undefined, "Nom du preset");
      var edName = right.add("edittext", undefined, "");
      edName.helpTip = "Nom affiché dans la liste de presets.";
      var lblTags = right.add("statictext", undefined, "Tags");
      var edTags = right.add("edittext", undefined, "");
      edTags.helpTip = "Mots-clés pour faciliter la recherche.";

      var lblModel = right.add("statictext", undefined, "Template (composition source)");
      var rowModel = right.add("group");
      rowModel.orientation = "row";
      rowModel.alignChildren = ["fill", "center"];
      var ddModel = rowModel.add("dropdownlist", undefined, listModelCompsFiltered());
      ddModel.minimumSize = [220, 24];
      var btnRefreshModels = rowModel.add("button", undefined, "🔄");
      var btnAuditTemplate = rowModel.add("button", undefined, "🧪");
      ddModel.helpTip = "Template utilisé pour créer l'élément AUTO.";
      btnRefreshModels.helpTip = "Actualiser la liste des templates du projet.";
      btnAuditTemplate.helpTip = "Auditer la conformité MB2 du template sélectionné.";

      var rowDurFade = right.add("group");
      rowDurFade.orientation = "row";
      rowDurFade.alignChildren = ["fill", "top"];
      var colDur = rowDurFade.add("group");
      colDur.orientation = "column"; colDur.alignChildren = ["fill", "top"];
      var colFade = rowDurFade.add("group");
      colFade.orientation = "column"; colFade.alignChildren = ["fill", "top"];
      var lblDur = colDur.add("statictext", undefined, "Duree (s)");
      var edDur = colDur.add("edittext", undefined, "");
      edDur.helpTip = "Durée de l'élément AUTO en secondes.";
      var lblFade = colFade.add("statictext", undefined, "Fade (s)");
      var edFade = colFade.add("edittext", undefined, "");
      edFade.helpTip = "Durée de la transition de sortie.";

      var rowXY = right.add("group");
      rowXY.orientation = "row";
      rowXY.alignChildren = ["fill", "top"];
      var colX = rowXY.add("group");
      colX.orientation = "column"; colX.alignChildren = ["fill", "top"];
      var colY = rowXY.add("group");
      colY.orientation = "column"; colY.alignChildren = ["fill", "top"];
      var lblX = colX.add("statictext", undefined, "Deplacement X");
      var edX = colX.add("edittext", undefined, "");
      edX.helpTip = "Décalage horizontal de l'animation de sortie.";
      var lblY = colY.add("statictext", undefined, "Deplacement Y");
      var edY = colY.add("edittext", undefined, "");
      edY.helpTip = "Décalage vertical de l'animation de sortie.";

      var rowSpawn = right.add("group");
      rowSpawn.orientation = "row";
      rowSpawn.alignChildren = ["fill", "top"];
      var colSpawnAnchor = rowSpawn.add("group");
      colSpawnAnchor.orientation = "column"; colSpawnAnchor.alignChildren = ["fill", "top"];
      var colSpawnX = rowSpawn.add("group");
      colSpawnX.orientation = "column"; colSpawnX.alignChildren = ["fill", "top"];
      var colSpawnY = rowSpawn.add("group");
      colSpawnY.orientation = "column"; colSpawnY.alignChildren = ["fill", "top"];
      var lblSpawnAnchor = colSpawnAnchor.add("statictext", undefined, "Apparition");
      var ddSpawnAnchor = colSpawnAnchor.add("dropdownlist", undefined, [
        "Milieu droite",
        "Milieu centre",
        "Milieu gauche",
        "Haut droite",
        "Haut centre",
        "Haut gauche",
        "Bas droite",
        "Bas centre",
        "Bas gauche"
      ]);
      var lblSpawnX = colSpawnX.add("statictext", undefined, "Apparition X");
      var edSpawnX = colSpawnX.add("edittext", undefined, "");
      var lblSpawnY = colSpawnY.add("statictext", undefined, "Apparition Y");
      var edSpawnY = colSpawnY.add("edittext", undefined, "");
      ddSpawnAnchor.helpTip = "Position de départ du calque dans la comp active.";
      edSpawnX.helpTip = "Offset X appliqué à la position d'apparition.";
      edSpawnY.helpTip = "Offset Y appliqué à la position d'apparition.";

      var rowLayout = right.add("group");
      rowLayout.orientation = "row";
      rowLayout.alignChildren = ["fill", "top"];
      var colLayoutMode = rowLayout.add("group");
      colLayoutMode.orientation = "column"; colLayoutMode.alignChildren = ["fill", "top"];
      var colLayoutW = rowLayout.add("group");
      colLayoutW.orientation = "column"; colLayoutW.alignChildren = ["fill", "top"];
      var colLayoutH = rowLayout.add("group");
      colLayoutH.orientation = "column"; colLayoutH.alignChildren = ["fill", "top"];
      var lblLayoutMode = colLayoutMode.add("statictext", undefined, "Placement");
      var ddLayoutMode = colLayoutMode.add("dropdownlist", undefined, [
        "Pile sous ancre (auto)",
        "Manuel",
        "Fullscreen"
      ]);
      var lblGridW = colLayoutW.add("statictext", undefined, "Largeur");
      var edGridW = colLayoutW.add("edittext", undefined, "");
      var lblGridH = colLayoutH.add("statictext", undefined, "Hauteur pile");
      var edGridH = colLayoutH.add("edittext", undefined, "");
      ddLayoutMode.helpTip = "Pile verticale sous une ancre dans la comp, ou mode manuel/fullscreen.";
      edGridW.helpTip = "Largeur logique du preset. Laisse 1 si tu ne t'en sers pas.";
      edGridH.helpTip = "Hauteur logique de pile: augmente cette valeur pour réserver plus d'espace vertical.";

      var rowFamily = right.add("group");
      rowFamily.orientation = "row";
      rowFamily.alignChildren = ["fill", "top"];
      var colFamily = rowFamily.add("group");
      colFamily.orientation = "column"; colFamily.alignChildren = ["fill", "top"];
      var lblFamily = colFamily.add("statictext", undefined, "Famille");
      var ddFamily = colFamily.add("dropdownlist", undefined, ["Texte", "Visuel"]);
      ddFamily.helpTip = "Texte = colonne texte. Visuel = zone visuelle (popups, champions, items, objectifs).";

      var rowSlots = right.add("group");
      rowSlots.orientation = "row";
      rowSlots.alignChildren = ["fill", "top"];
      var colTxtSlots = rowSlots.add("group");
      colTxtSlots.orientation = "column"; colTxtSlots.alignChildren = ["fill", "top"];
      var colImgSlots = rowSlots.add("group");
      colImgSlots.orientation = "column"; colImgSlots.alignChildren = ["fill", "top"];
      var colAutoSlots = rowSlots.add("group");
      colAutoSlots.orientation = "column"; colAutoSlots.alignChildren = ["fill", "top"];
      var lblTxtSlots = colTxtSlots.add("statictext", undefined, "Champs texte");
      var edTxtSlots = colTxtSlots.add("edittext", undefined, "");
      var lblImgSlots = colImgSlots.add("statictext", undefined, "Champs image");
      var edImgSlots = colImgSlots.add("edittext", undefined, "");
      var lblAutoSlots = colAutoSlots.add("statictext", undefined, "Analyse template");
      var btnAutoSlots = colAutoSlots.add("button", undefined, "🔎 Auto");
      edTxtSlots.helpTip = "Nombre de champs texte attendus par ce preset.";
      edImgSlots.helpTip = "Nombre de champs image attendus par ce preset.";
      btnAutoSlots.helpTip = "Analyse la composition template et remplit automatiquement les champs texte/image.";

      var rowBlurColor = right.add("group");
      rowBlurColor.orientation = "row";
      rowBlurColor.alignChildren = ["fill", "top"];
      var colBlur = rowBlurColor.add("group");
      colBlur.orientation = "column"; colBlur.alignChildren = ["fill", "top"];
      var colColor = rowBlurColor.add("group");
      colColor.orientation = "column"; colColor.alignChildren = ["fill", "top"];
      var lblBlur = colBlur.add("statictext", undefined, "Flou");
      var edBlur = colBlur.add("edittext", undefined, "");
      edBlur.helpTip = "Intensité du flou de sortie.";
      var lblColor = colColor.add("statictext", undefined, "Couleur du marqueur");
      var ddLabel = colColor.add("dropdownlist", undefined, []);
      ddLabel.helpTip = "Couleur du marqueur plugin.";
      for(var li=0; li<LABELS.length; li++) ddLabel.add("item", LABELS[li].n + " (" + LABELS[li].i + ")");

      function setPlaceholder(ed, text){
        ed.__ph = text;
        if(!trim(ed.text)){ ed.text = text; ed.__isPH = true; }
        ed.onActivate = function(){ if(ed.__isPH){ ed.text = ""; ed.__isPH = false; } };
        ed.onDeactivate = function(){ if(!trim(ed.text)){ ed.text = ed.__ph; ed.__isPH = true; } };
      }
      function fieldText(ed){ return ed.__isPH ? "" : trim(ed.text || ""); }
      function setField(ed, value){ ed.__isPH = false; ed.text = String(value); }
      function validateNumberField(ed, lbl, baseLabel){
        var raw = fieldText(ed);
        if(raw === ""){ lbl.text = baseLabel; return false; }
        var n = parseFloat(raw);
        if(isNaN(n)){ lbl.text = "❌ " + baseLabel; return false; }
        lbl.text = "✅ " + baseLabel;
        return true;
      }
      function updateValidationUI(){
        validateNumberField(edDur, lblDur, "Duree (s)");
        validateNumberField(edFade, lblFade, "Fade (s)");
        validateNumberField(edX, lblX, "Deplacement X");
        validateNumberField(edY, lblY, "Deplacement Y");
        validateNumberField(edBlur, lblBlur, "Flou");
      }
      function applyExpertMode(){
        var show = true;
        lblTags.visible = show; edTags.visible = show;
        lblX.visible = show; edX.visible = show;
        lblY.visible = show; edY.visible = show;
        lblBlur.visible = show; edBlur.visible = show;
        lblColor.visible = show; ddLabel.visible = show;
      }

      setPlaceholder(edName, "ex: Titre principal");
      setPlaceholder(edTags, "ex: lower-third, logo");
      setPlaceholder(edDur, "ex: 6");
      setPlaceholder(edFade, "ex: 0.35");
      setPlaceholder(edX, "ex: 0");
      setPlaceholder(edY, "ex: -100");
      setPlaceholder(edSpawnX, "ex: 0");
      setPlaceholder(edSpawnY, "ex: 0");
      setPlaceholder(edGridW, "ex: 1");
      setPlaceholder(edGridH, "ex: 1");
      setPlaceholder(edTxtSlots, "ex: 1");
      setPlaceholder(edImgSlots, "ex: 0");
      setPlaceholder(edBlur, "ex: 50");

      var SPAWN_ITEMS = [
        { k: "middle_right", label: "Milieu droite" },
        { k: "middle_center", label: "Milieu centre" },
        { k: "middle_left", label: "Milieu gauche" },
        { k: "top_right", label: "Haut droite" },
        { k: "top_center", label: "Haut centre" },
        { k: "top_left", label: "Haut gauche" },
        { k: "bottom_right", label: "Bas droite" },
        { k: "bottom_center", label: "Bas centre" },
        { k: "bottom_left", label: "Bas gauche" }
      ];
      function spawnIndexByKey(key){
        var wanted = trim(key || "").toLowerCase();
        for(var si=0; si<SPAWN_ITEMS.length; si++) if(SPAWN_ITEMS[si].k === wanted) return si;
        return 0;
      }
      function spawnKeyFromSelection(){
        if(!ddSpawnAnchor.selection) return "middle_right";
        return SPAWN_ITEMS[ddSpawnAnchor.selection.index].k;
      }
      function layoutIndexByKey(key){
        var k = trim(key || "").toLowerCase();
        if(k === "stack_anchor") return 0;
        if(k === "manual") return 1;
        if(k === "fullscreen") return 2;
        return 0;
      }
      function layoutKeyFromSelection(){
        if(!ddLayoutMode.selection) return "stack_anchor";
        if(ddLayoutMode.selection.index === 1) return "manual";
        if(ddLayoutMode.selection.index === 2) return "fullscreen";
        return "stack_anchor";
      }
      ddSpawnAnchor.selection = 0;
      ddLayoutMode.selection = 0;

      function findPresetById(id){
        for(var i=0; i<cat.presets.length; i++) if(cat.presets[i].id === id) return cat.presets[i];
        return null;
      }

      function refreshModelDropdown(keepName){
        var keep = keepName || (ddModel.selection ? ddModel.selection.text : "");
        var items = listModelCompsFiltered(false);
        ddModel.removeAll();
        for(var i=0; i<items.length; i++) ddModel.add("item", items[i]);
        ddModel.selection = null;
        for(var j=0; j<ddModel.items.length; j++) if(ddModel.items[j].text === keep){ ddModel.selection = j; break; }
      }
      function setModelLabelAuto(isAuto){
        lblModel.text = isAuto ? "Template (composition source) (auto)" : "Template (composition source)";
      }
      function applyAutoTemplateIfPossible(force){
        if(!selectedPreset) return false;
        if(!force && trim(selectedPreset.modelComp || "")) return false;
        var candidate = findCompByName(selectedPreset.name || "");
        if(!candidate) return false;
        selectedPreset.modelComp = candidate.name;
        ddModel.selection = null;
        for(var i=0; i<ddModel.items.length; i++) if(ddModel.items[i].text === candidate.name){ ddModel.selection = i; break; }
        modelAutoAssigned = true;
        setModelLabelAuto(true);
        return true;
      }
      function autoDetectSlotCountsForSelectedPreset(showStatus){
        if(!selectedPreset) return;
        var m = trim(selectedPreset.modelComp || "");
        if(!m) return;
        var schema = detectTemplateFieldSchema(m);
        selectedPreset.textSlots = schema.text;
        selectedPreset.imageSlots = schema.image;
        setField(edTxtSlots, selectedPreset.textSlots);
        setField(edImgSlots, selectedPreset.imageSlots);
        save();
        if(showStatus) setStatus("🔎 Template analysé: texte=" + schema.text + ", image=" + schema.image);
      }

      function refreshPresetList(){
        var prevSelectedId = selectedPreset ? selectedPreset.id : "";
        lb.removeAll();
        displayedPresetIds = [];
        var q = trim(edSearch.text || "").toLowerCase();
        var favOnly = chkFavOnly.value;

        for(var i=0; i<cat.presets.length; i++){
          var p = cat.presets[i];
          var name = (p.name || "").toLowerCase();
          var tags = (p.tags || "").toLowerCase();
          if(favOnly && !p.favorite) continue;
          if(q && name.indexOf(q) < 0 && tags.indexOf(q) < 0) continue;
          lb.add("item", (p.favorite ? "⭐ " : "") + p.name);
          displayedPresetIds.push(p.id);
        }

        var idx = -1;
        if(db.selectedPresetId){ for(var di=0; di<displayedPresetIds.length; di++) if(displayedPresetIds[di] === db.selectedPresetId){ idx = di; break; } }
        if(idx < 0 && displayedPresetIds.length > 0) idx = 0;
        if(idx >= 0){
          lb.selection = idx;
          if(prevSelectedId && displayedPresetIds[idx] === prevSelectedId && selectedPreset){
            currentSelectedPreset = selectedPreset;
            updateIndicators();
            updateActionState();
          }else{
            onPresetSelectionChanged();
          }
        }
        else { selectedPreset = null; currentSelectedPreset = null; clearForm(); updateIndicators(); updateGuide(1); updateActionState(); }
      }

      function clearForm(){
        isLoadingPreset = true;
        try{
          edName.text = ""; edName.__isPH = false; edName.onDeactivate();
          edTags.text = ""; edTags.__isPH = false; edTags.onDeactivate();
          edDur.text = ""; edDur.__isPH = false; edDur.onDeactivate();
          edFade.text = ""; edFade.__isPH = false; edFade.onDeactivate();
          edX.text = ""; edX.__isPH = false; edX.onDeactivate();
          edY.text = ""; edY.__isPH = false; edY.onDeactivate();
          edSpawnX.text = ""; edSpawnX.__isPH = false; edSpawnX.onDeactivate();
          edSpawnY.text = ""; edSpawnY.__isPH = false; edSpawnY.onDeactivate();
          edGridW.text = ""; edGridW.__isPH = false; edGridW.onDeactivate();
          edGridH.text = ""; edGridH.__isPH = false; edGridH.onDeactivate();
          edTxtSlots.text = ""; edTxtSlots.__isPH = false; edTxtSlots.onDeactivate();
          edImgSlots.text = ""; edImgSlots.__isPH = false; edImgSlots.onDeactivate();
          edBlur.text = ""; edBlur.__isPH = false; edBlur.onDeactivate();
          ddModel.selection = null;
          ddSpawnAnchor.selection = 0;
          ddLayoutMode.selection = 0;
          ddLabel.selection = null;
          lblDur.text = "Duree (s)";
          lblFade.text = "Fade (s)";
          lblX.text = "Deplacement X";
          lblY.text = "Deplacement Y";
          lblBlur.text = "Flou";
          lblGridW.text = "Largeur";
          lblGridH.text = "Hauteur pile";
        }finally{ isLoadingPreset = false; }
      }

      function labelIndexByValue(v){ for(var i=0; i<LABELS.length; i++) if(LABELS[i].i === v) return i; return -1; }

      function updateActionState(){
        var compOk = !!activeComp();
        var presetOk = !!selectedPreset;
        btnMarker.enabled = compOk && presetOk;
        btnPlace.enabled = compOk && presetOk;
        btnPlaceMain.enabled = compOk && presetOk;
        btnApplyAllInline.enabled = compOk;
        btnCleanMkInline.enabled = compOk;
        btnCleanAutoInline.enabled = compOk;
      }

      function onPresetSelectionChanged(){
        if(!lb.selection){
          selectedPreset = null;
          currentSelectedPreset = null;
          db.selectedPresetId = "";
          save();
          clearForm();
          updateIndicators();
          updateActionState();
          updateGuide(1);
          return;
        }

        var id = displayedPresetIds[lb.selection.index];
        selectedPreset = findPresetById(id);
        currentSelectedPreset = selectedPreset;
        if(!selectedPreset) return;
        db.selectedPresetId = selectedPreset.id;
        save();

        isLoadingPreset = true;
        try{
          setField(edName, selectedPreset.name);
          setField(edTags, selectedPreset.tags || "");
          setField(edDur, selectedPreset.dur);
          setField(edFade, selectedPreset.fade);
          setField(edX, selectedPreset.moveX);
          setField(edY, selectedPreset.moveY);
          setField(edSpawnX, selectedPreset.spawnOffsetX);
          setField(edSpawnY, selectedPreset.spawnOffsetY);
          setField(edGridW, selectedPreset.gridWUnits);
          setField(edGridH, selectedPreset.gridHUnits);
          ddFamily.selection = getPresetFamily(selectedPreset) === "visual" ? 1 : 0;
          setField(edTxtSlots, selectedPreset.textSlots);
          setField(edImgSlots, selectedPreset.imageSlots);
          ddSpawnAnchor.selection = spawnIndexByKey(selectedPreset.spawnAnchor);
          ddLayoutMode.selection = layoutIndexByKey(selectedPreset.layoutMode || "stack_anchor");
          setField(edBlur, selectedPreset.blur);

          ddModel.selection = null;
          for(var i=0; i<ddModel.items.length; i++) if(ddModel.items[i].text === selectedPreset.modelComp){ ddModel.selection = i; break; }
          modelAutoAssigned = false;
          if(!selectedPreset.modelComp) applyAutoTemplateIfPossible(false);
          setModelLabelAuto(modelAutoAssigned);
          var li = labelIndexByValue(selectedPreset.markerLabel);
          ddLabel.selection = (li >= 0) ? li : null;
          updateValidationUI();
        }finally{ isLoadingPreset = false; }

        updateIndicators();
        updateActionState();
        updateGuide(2);
      }

      function saveSelectedPreset(){
        if(isLoadingPreset || !selectedPreset) return;
        var oldName = selectedPreset.name || "";
        var oldTags = selectedPreset.tags || "";
        selectedPreset.name = fieldText(edName) || selectedPreset.name;
        if(!selectedPreset.name) selectedPreset.name = "preset";
        selectedPreset.tags = fieldText(edTags);
        var manualModel = ddModel.selection ? ddModel.selection.text : "";
        selectedPreset.modelComp = manualModel;
        if(!manualModel){
          var force = trim(oldName).toLowerCase() !== trim(selectedPreset.name).toLowerCase();
          if(applyAutoTemplateIfPossible(force)){
            setStatus("🧠 Template auto détecté : " + selectedPreset.modelComp + " (auto)");
          }
        }else{
          modelAutoAssigned = false;
        }
        setModelLabelAuto(modelAutoAssigned);
        if(selectedPreset.modelComp && (modelAutoAssigned || (selectedPreset.textSlots <= 0 && selectedPreset.imageSlots <= 0))){
          var autoSchema = detectTemplateFieldSchema(selectedPreset.modelComp);
          selectedPreset.textSlots = autoSchema.text;
          selectedPreset.imageSlots = autoSchema.image;
          setField(edTxtSlots, selectedPreset.textSlots);
          setField(edImgSlots, selectedPreset.imageSlots);
        }
        selectedPreset.dur = toNum(fieldText(edDur), selectedPreset.dur);
        selectedPreset.fade = toNum(fieldText(edFade), selectedPreset.fade);
        selectedPreset.moveX = toNum(fieldText(edX), selectedPreset.moveX);
        selectedPreset.moveY = toNum(fieldText(edY), selectedPreset.moveY);
        selectedPreset.spawnAnchor = spawnKeyFromSelection();
        selectedPreset.spawnOffsetX = toNum(fieldText(edSpawnX), selectedPreset.spawnOffsetX);
        selectedPreset.spawnOffsetY = toNum(fieldText(edSpawnY), selectedPreset.spawnOffsetY);
        selectedPreset.layoutMode = layoutKeyFromSelection();
        selectedPreset.family = (ddFamily.selection && ddFamily.selection.index === 1) ? "visual" : "text";
        selectedPreset.gridWUnits = Math.max(1, Math.min(6, parseInt(toNum(fieldText(edGridW), selectedPreset.gridWUnits), 10)));
        selectedPreset.gridHUnits = Math.max(1, Math.min(8, parseInt(toNum(fieldText(edGridH), selectedPreset.gridHUnits), 10)));
        selectedPreset.textSlots = Math.max(0, parseInt(toNum(fieldText(edTxtSlots), selectedPreset.textSlots), 10));
        selectedPreset.imageSlots = Math.max(0, parseInt(toNum(fieldText(edImgSlots), selectedPreset.imageSlots), 10));
        selectedPreset.blur = toNum(fieldText(edBlur), selectedPreset.blur);
        selectedPreset.markerLabel = ddLabel.selection ? LABELS[ddLabel.selection.index].i : selectedPreset.markerLabel;
        updateValidationUI();
        save();
        if(oldName !== selectedPreset.name || oldTags !== selectedPreset.tags) refreshPresetList();
        updateIndicators();
      }

      lb.onChange = function(){ setHelp("Selection du preset actif."); onPresetSelectionChanged(); };
      edName.onChange = function(){ setHelp("Nom du preset."); saveSelectedPreset(); };
      edTags.onChange = function(){ setHelp("Tags pour la recherche."); saveSelectedPreset(); };
      edDur.onChange = function(){ setHelp("Duree de l'element AUTO."); saveSelectedPreset(); };
      edFade.onChange = function(){ setHelp("Duree du fade de sortie."); saveSelectedPreset(); };
      edX.onChange = function(){ setHelp("Deplacement horizontal outro."); saveSelectedPreset(); };
      edY.onChange = function(){ setHelp("Deplacement vertical outro."); saveSelectedPreset(); };
      ddSpawnAnchor.onChange = function(){ setHelp("Position d'apparition du calque."); saveSelectedPreset(); };
      edSpawnX.onChange = function(){ setHelp("Offset X d'apparition."); saveSelectedPreset(); };
      edSpawnY.onChange = function(){ setHelp("Offset Y d'apparition."); saveSelectedPreset(); };
      ddLayoutMode.onChange = function(){ setHelp("Mode placement: pile auto, manuel ou fullscreen."); saveSelectedPreset(); };
      ddFamily.onChange = function(){ setHelp("Famille de layout: texte ou visuel."); saveSelectedPreset(); };
      edGridW.onChange = function(){ setHelp("Largeur legacy ou compatibilité preset."); saveSelectedPreset(); };
      edGridH.onChange = function(){ setHelp("Hauteur logique utilisée pour empiler sans overlap."); saveSelectedPreset(); };
      edTxtSlots.onChange = function(){ setHelp("Nombre de champs texte attendus."); saveSelectedPreset(); };
      edImgSlots.onChange = function(){ setHelp("Nombre de champs image attendus."); saveSelectedPreset(); };
      edBlur.onChange = function(){ setHelp("Niveau de flou outro."); saveSelectedPreset(); };
      ddModel.onChange = function(){ setHelp("Composition modele choisie."); modelAutoAssigned = false; setModelLabelAuto(false); saveSelectedPreset(); autoDetectSlotCountsForSelectedPreset(true); updateIndicators(); };
      ddLabel.onChange = function(){ setHelp("Couleur du marqueur plugin."); saveSelectedPreset(); };
      btnAutoSlots.onClick = function(){ setHelp("Analyse les champs template."); autoDetectSlotCountsForSelectedPreset(true); };
      btnAuditTemplate.onClick = function(){ setHelp("Audit de conformité du template."); openTemplateAuditAction(ddModel.selection ? ddModel.selection.text : ""); };

      btnRefreshModels.onClick = function(){ invalidateModelCompListCache(); setHelp("Liste des compositions modeles actualisee."); var keep = selectedPreset ? selectedPreset.modelComp : ""; var items = listModelCompsFiltered(true); ddModel.removeAll(); for(var i=0; i<items.length; i++) ddModel.add("item", items[i]); ddModel.selection = null; for(var j=0; j<ddModel.items.length; j++) if(ddModel.items[j].text === keep){ ddModel.selection = j; break; } };

      btnMarker.onClick = function(){
        setHelp("Pose uniquement un marqueur plugin.");
        if(!selectedPreset){ alert("Selectionne un preset."); return; }
        var comp = activeComp();
        if(!comp){ alert("Ouvre une composition active."); return; }
        app.beginUndoGroup("MB2 Add Marker");
        try{ addMarker(comp, selectedPreset); setStatus("📍 Marqueur ajoute : " + selectedPreset.name); }
        finally{ app.endUndoGroup(); }
        updateIndicators();
      };

      btnPlace.onClick = function(){
        setHelp("Pose le preset au curseur temporel.");
        if(!selectedPreset){ alert("Selectionne un preset."); return; }
        placePresetAtCTI(selectedPreset, setStatus, secureMode);
        updateGuide(3);
        updateIndicators();
      };
      btnApplyAllInline.onClick = function(){
        setHelp("Application en masse des marqueurs plugin.");
        applyAllPluginMarkers(db, setStatus, secureMode);
        updateIndicators();
      };
      btnCleanMkInline.onClick = function(){
        setHelp("Nettoyage des marqueurs plugin.");
        cleanPluginMarkers(setStatus, secureMode);
        updateIndicators();
      };
      btnCleanAutoInline.onClick = function(){
        setHelp("Nettoyage des calques AUTO.");
        cleanupAutoLayers(setStatus, secureMode);
        updateIndicators();
      };

      btnAddPreset.onClick = function(){
        setHelp("Ajout d'un preset.");
        var name = trim(prompt("Nom du preset", "Nouveau preset") || "");
        if(!name) return;
        var p = presetDefaults(name, db);
        cat.presets.push(p);
        db.selectedPresetId = p.id;
        save();
        refreshPresetList();
        setStatus("➕ Preset ajoute");
      };

      btnDupPreset.onClick = function(){
        setHelp("Duplication du preset.");
        if(!selectedPreset){ alert("Selectionne un preset."); return; }
        var copy = parseJSON(stringifyJSON(selectedPreset));
        copy.id = makeId();
        copy.name = selectedPreset.name + " (copie)";
        copy.markerLabel = nextAutoLabel(db);
        copy.favorite = false;
        cat.presets.push(copy);
        db.selectedPresetId = copy.id;
        save();
        refreshPresetList();
        setStatus("🧬 Preset duplique");
      };

      btnDelPreset.onClick = function(){
        setHelp("Suppression du preset.");
        if(!selectedPreset){ alert("Selectionne un preset."); return; }
        if(secureMode && !confirm("🗑 Supprimer le preset : " + selectedPreset.name + " ?")) return;
        var kept = [];
        for(var i=0; i<cat.presets.length; i++) if(cat.presets[i].id !== selectedPreset.id) kept.push(cat.presets[i]);
        cat.presets = kept;
        db.selectedPresetId = (cat.presets.length ? cat.presets[Math.max(0, cat.presets.length - 1)].id : "");
        save();
        refreshPresetList();
        setStatus("🗑 Preset supprime");
      };

      btnFavPreset.onClick = function(){
        setHelp("Bascule favori.");
        if(!selectedPreset){ alert("Selectionne un preset."); return; }
        selectedPreset.favorite = !selectedPreset.favorite;
        save();
        refreshPresetList();
        setStatus(selectedPreset.favorite ? "⭐ Preset ajoute aux favoris" : "⭐ Preset retire des favoris");
      };
      function openPresetEditorPopup(){
        if(!selectedPreset){ alert("Selectionne un preset."); return; }
        var dlg = new Window("dialog", "Éditeur preset - " + selectedPreset.name, undefined, { resizeable: true });
        dlg.orientation = "column";
        dlg.alignChildren = ["fill", "top"];
        dlg.margins = 10;
        dlg.spacing = 8;
        try{ dlg.minimumSize = [520, 520]; }catch(_eMinDlg){}

        var gName = dlg.add("group"); gName.orientation = "row";
        gName.add("statictext", undefined, "Nom");
        var eName = gName.add("edittext", undefined, selectedPreset.name || ""); eName.characters = 28;

        var gTags = dlg.add("group"); gTags.orientation = "row";
        gTags.add("statictext", undefined, "Tags");
        var eTags = gTags.add("edittext", undefined, selectedPreset.tags || ""); eTags.characters = 36;

        var gDesc = dlg.add("group"); gDesc.orientation = "column"; gDesc.alignChildren = ["fill", "top"];
        gDesc.add("statictext", undefined, "Description preset (contexte d'usage)");
        var eDesc = gDesc.add("edittext", undefined, selectedPreset.description || "", { multiline: true });
        eDesc.minimumSize = [460, 68];

        var gModel = dlg.add("group"); gModel.orientation = "row"; gModel.alignChildren = ["fill", "center"];
        gModel.add("statictext", undefined, "Template");
        var ddTpl = gModel.add("dropdownlist", undefined, listModelCompsFiltered());
        ddTpl.minimumSize = [260, 24];
        var bRefreshTpl = gModel.add("button", undefined, "🔄");
        var bAuditTpl = gModel.add("button", undefined, "🧪");
        for(var mi=0; mi<ddTpl.items.length; mi++) if(ddTpl.items[mi].text === selectedPreset.modelComp){ ddTpl.selection = mi; break; }

        var gLine1 = dlg.add("group"); gLine1.orientation = "row";
        gLine1.add("statictext", undefined, "Durée");
        var eDur = gLine1.add("edittext", undefined, String(selectedPreset.dur)); eDur.characters = 6;
        gLine1.add("statictext", undefined, "Fade");
        var eFade = gLine1.add("edittext", undefined, String(selectedPreset.fade)); eFade.characters = 6;
        gLine1.add("statictext", undefined, "Flou");
        var eBlur = gLine1.add("edittext", undefined, String(selectedPreset.blur)); eBlur.characters = 6;

        var gLine2 = dlg.add("group"); gLine2.orientation = "row";
        gLine2.add("statictext", undefined, "Outro X");
        var eX = gLine2.add("edittext", undefined, String(selectedPreset.moveX)); eX.characters = 6;
        gLine2.add("statictext", undefined, "Outro Y");
        var eY = gLine2.add("edittext", undefined, String(selectedPreset.moveY)); eY.characters = 6;

        var gSpawn = dlg.add("group"); gSpawn.orientation = "row";
        gSpawn.add("statictext", undefined, "Apparition");
        var ddSpawn = gSpawn.add("dropdownlist", undefined, []);
        for(var sp=0; sp<SPAWN_ITEMS.length; sp++) ddSpawn.add("item", SPAWN_ITEMS[sp].label);
        ddSpawn.selection = spawnIndexByKey(selectedPreset.spawnAnchor);
        gSpawn.add("statictext", undefined, "X");
        var eSpawnX = gSpawn.add("edittext", undefined, String(selectedPreset.spawnOffsetX)); eSpawnX.characters = 6;
        gSpawn.add("statictext", undefined, "Y");
        var eSpawnY = gSpawn.add("edittext", undefined, String(selectedPreset.spawnOffsetY)); eSpawnY.characters = 6;

        var gLayout = dlg.add("group"); gLayout.orientation = "row";
        gLayout.add("statictext", undefined, "Placement");
        var ddLayout = gLayout.add("dropdownlist", undefined, ["Pile sous ancre (auto)", "Manuel", "Fullscreen"]);
        ddLayout.selection = layoutIndexByKey(selectedPreset.layoutMode || "stack_anchor");
        gLayout.add("statictext", undefined, "Largeur");
        var eGridW = gLayout.add("edittext", undefined, String(selectedPreset.gridWUnits || 1)); eGridW.characters = 4;
        gLayout.add("statictext", undefined, "Hauteur pile");
        var eGridH = gLayout.add("edittext", undefined, String(selectedPreset.gridHUnits || 1)); eGridH.characters = 4;

        var gFamily = dlg.add("group");
        gFamily.orientation = "row";
        gFamily.alignChildren = ["left", "center"];
        gFamily.add("statictext", undefined, "Famille");
        var ddFamily = gFamily.add("dropdownlist", undefined, ["Texte", "Visuel"]);
        ddFamily.selection = getPresetFamily(selectedPreset) === "visual" ? 1 : 0;

        var gSlots = dlg.add("group"); gSlots.orientation = "row";
        gSlots.add("statictext", undefined, "Textes");
        var eTxtSlots = gSlots.add("edittext", undefined, String(selectedPreset.textSlots)); eTxtSlots.characters = 5;
        gSlots.add("statictext", undefined, "Images");
        var eImgSlots = gSlots.add("edittext", undefined, String(selectedPreset.imageSlots)); eImgSlots.characters = 5;
        var bAutoSlots = gSlots.add("button", undefined, "🔎 Auto");

        var gColor = dlg.add("group"); gColor.orientation = "row";
        gColor.add("statictext", undefined, "Couleur marqueur");
        var ddColor = gColor.add("dropdownlist", undefined, []);
        for(var li2=0; li2<LABELS.length; li2++) ddColor.add("item", LABELS[li2].n + " (" + LABELS[li2].i + ")");
        var idxColor = labelIndexByValue(selectedPreset.markerLabel);
        ddColor.selection = (idxColor >= 0) ? idxColor : 0;

        bRefreshTpl.onClick = function(){
          var keep = ddTpl.selection ? ddTpl.selection.text : "";
          invalidateModelCompListCache();
          var items = listModelCompsFiltered(true);
          ddTpl.removeAll();
          for(var i=0; i<items.length; i++) ddTpl.add("item", items[i]);
          for(var j=0; j<ddTpl.items.length; j++) if(ddTpl.items[j].text === keep){ ddTpl.selection = j; break; }
        };
        bAuditTpl.onClick = function(){ openTemplateAuditAction(ddTpl.selection ? ddTpl.selection.text : ""); };
        bAutoSlots.onClick = function(){
          var tplName = ddTpl.selection ? ddTpl.selection.text : "";
          if(!tplName){ alert("Choisis un template."); return; }
          var schema = detectTemplateFieldSchema(tplName);
          eTxtSlots.text = String(schema.text);
          eImgSlots.text = String(schema.image);
        };

        var gBtns = dlg.add("group"); gBtns.orientation = "row"; gBtns.alignment = "right";
        var bCancel = gBtns.add("button", undefined, "Annuler");
        var bOk = gBtns.add("button", undefined, "Enregistrer");
        bCancel.onClick = function(){ dlg.close(0); };
        bOk.onClick = function(){
          selectedPreset.name = trim(eName.text || "") || selectedPreset.name || "preset";
          selectedPreset.tags = trim(eTags.text || "");
          selectedPreset.description = trim(eDesc.text || "");
          selectedPreset.modelComp = ddTpl.selection ? ddTpl.selection.text : "";
          selectedPreset.dur = toNum(eDur.text, selectedPreset.dur);
          selectedPreset.fade = toNum(eFade.text, selectedPreset.fade);
          selectedPreset.blur = toNum(eBlur.text, selectedPreset.blur);
          selectedPreset.moveX = toNum(eX.text, selectedPreset.moveX);
          selectedPreset.moveY = toNum(eY.text, selectedPreset.moveY);
          selectedPreset.spawnAnchor = ddSpawn.selection ? SPAWN_ITEMS[ddSpawn.selection.index].k : (selectedPreset.spawnAnchor || "middle_right");
          selectedPreset.spawnOffsetX = toNum(eSpawnX.text, selectedPreset.spawnOffsetX);
          selectedPreset.spawnOffsetY = toNum(eSpawnY.text, selectedPreset.spawnOffsetY);
          selectedPreset.layoutMode = (!ddLayout.selection || ddLayout.selection.index === 0) ? "stack_anchor" : (ddLayout.selection.index === 1 ? "manual" : "fullscreen");
          selectedPreset.family = (ddFamily.selection && ddFamily.selection.index === 1) ? "visual" : "text";
          selectedPreset.gridWUnits = Math.max(1, Math.min(6, parseInt(toNum(eGridW.text, selectedPreset.gridWUnits), 10)));
          selectedPreset.gridHUnits = Math.max(1, Math.min(8, parseInt(toNum(eGridH.text, selectedPreset.gridHUnits), 10)));
          selectedPreset.textSlots = Math.max(0, parseInt(toNum(eTxtSlots.text, selectedPreset.textSlots), 10));
          selectedPreset.imageSlots = Math.max(0, parseInt(toNum(eImgSlots.text, selectedPreset.imageSlots), 10));
          if(ddColor.selection) selectedPreset.markerLabel = LABELS[ddColor.selection.index].i;
          save();
          refreshPresetList();
          setStatus("🛠 Preset mis à jour");
          dlg.close(1);
        };
        dlg.layout.layout(true);
        dlg.show();
      }
      btnToggleEditor.onClick = function(){
        setHelp("Ouvre l'éditeur preset en popup.");
        openPresetEditorPopup();
      };

      applyExpertMode();
      applyCompactModeLocal();
      setEditorVisible(false, true);
      refreshPresetList();
      refreshPresetListCurrent = refreshPresetList;
      updateActionState();
      dbg("renderCategoryContent done");
      wrapHandler(lb, "onChange", "preset-select");
      wrapHandler(edName, "onChange", "preset-name");
      wrapHandler(edTags, "onChange", "preset-tags");
      wrapHandler(edDur, "onChange", "preset-duree");
      wrapHandler(edFade, "onChange", "preset-fade");
      wrapHandler(edX, "onChange", "preset-x");
      wrapHandler(edY, "onChange", "preset-y");
      wrapHandler(ddSpawnAnchor, "onChange", "preset-spawn-anchor");
      wrapHandler(edSpawnX, "onChange", "preset-spawn-x");
      wrapHandler(edSpawnY, "onChange", "preset-spawn-y");
      wrapHandler(ddLayoutMode, "onChange", "preset-layout-mode");
      wrapHandler(edGridW, "onChange", "preset-grid-w");
      wrapHandler(edGridH, "onChange", "preset-grid-h");
      wrapHandler(edTxtSlots, "onChange", "preset-text-slots");
      wrapHandler(edImgSlots, "onChange", "preset-image-slots");
      wrapHandler(btnAutoSlots, "onClick", "preset-auto-slots");
      wrapHandler(btnAuditTemplate, "onClick", "preset-audit-template");
      wrapHandler(edBlur, "onChange", "preset-flou");
      wrapHandler(ddModel, "onChange", "preset-template");
      wrapHandler(ddLabel, "onChange", "preset-couleur");
      wrapHandler(btnRefreshModels, "onClick", "template-refresh");
      wrapHandler(btnMarker, "onClick", "action-marker");
      wrapHandler(btnPlace, "onClick", "action-poser");
      wrapHandler(btnApplyAllInline, "onClick", "action-applyall-inline");
      wrapHandler(btnCleanMkInline, "onClick", "action-cleanmk-inline");
      wrapHandler(btnCleanAutoInline, "onClick", "action-cleanauto-inline");
      wrapHandler(btnAddPreset, "onClick", "preset-add");
      wrapHandler(btnDupPreset, "onClick", "preset-dup");
      wrapHandler(btnDelPreset, "onClick", "preset-del");
      wrapHandler(btnFavPreset, "onClick", "preset-fav");
      wrapHandler(btnToggleEditor, "onClick", "preset-editor-toggle");
      }catch(e){
        setStatus("❌ Erreur de rendu catégorie");
        dbg("renderCategoryContent error=" + e.toString());
        alert("Erreur de rendu catégorie: " + e.toString() + (e.line ? (" (ligne " + e.line + ")") : ""));
      }
      safeRelayout();
    }

    function addCategory(){
      setHelp("Creation d'une categorie.");
      var n = trim(prompt("Nom de la nouvelle categorie", "Categorie") || "");
      if(!n) return;
      var p = presetDefaults("Nouveau preset", db);
      db.categories.push({ name: n, presets: [p] });
      db.selectedCategory = db.categories.length - 1;
      db.selectedPresetId = p.id;
      db = sanitizeDB(db);
      dbg("addCategory name=" + n + " selected=" + db.selectedCategory);
      save();
      rebuildCategoryTabs();
      selectTabByIndex(catTabs, db.selectedCategory);
      renderCategoryContent();
      setStatus("➕ Categorie ajoutee");
    }

    function renameCategory(){
      setHelp("Renommage de categorie.");
      var cat = getCurrentCategory();
      if(!cat) return;
      var n = trim(prompt("Nouveau nom de categorie", cat.name) || "");
      if(!n || n === cat.name) return;
      cat.name = n;
      db = sanitizeDB(db);
      save();
      rebuildCategoryTabs();
      renderCategoryContent();
      setStatus("✏️ Categorie renommee");
    }

    function deleteCategory(){
      setHelp("Suppression de categorie.");
      if(db.categories.length <= 1){ alert("Impossible de supprimer la derniere categorie."); return; }
      var cat = getCurrentCategory();
      if(!cat) return;
      if(secureMode && !confirm("🗑 Supprimer la categorie '" + cat.name + "' et ses presets ?")) return;
      db.categories.splice(db.selectedCategory, 1);
      db.selectedCategory = Math.max(0, Math.min(db.selectedCategory, db.categories.length - 1));
      db.selectedPresetId = "";
      db = sanitizeDB(db);
      save();
      rebuildCategoryTabs();
      renderCategoryContent();
      setStatus("🗑 Categorie supprimee");
    }

    btnPlaceMain.onClick = function(){
      setHelp("Action principale: poser le preset au curseur.");
      if(!currentSelectedPreset){ alert("Selectionne un preset."); return; }
      placePresetAtCTI(currentSelectedPreset, setStatus, secureMode);
      updateGuide(3);
      updateIndicators();
    };
    btnApplyAll.onClick = function(){ setHelp("Application en masse des marqueurs plugin."); applyAllPluginMarkers(db, setStatus, secureMode); updateIndicators(); };
    btnCleanMk.onClick = function(){ setHelp("Nettoyage des marqueurs plugin."); cleanPluginMarkers(setStatus, secureMode); updateIndicators(); };
    btnCleanAuto.onClick = function(){ setHelp("Nettoyage des calques AUTO."); cleanupAutoLayers(setStatus, secureMode); updateIndicators(); };

    btnCsvQuick.onClick = function(){
      setHelp("Ouvre directement l'assistant CSV.");
      runCsvImport();
    };
    btnMediaMain.onClick = function(){
      setHelp("Gestion de la base médias.");
      openMediaDbWindow();
    };
    btnExportMain.onClick = function(){
      setHelp("Export presets JSON.");
      exportPresets();
    };
    btnImportMain.onClick = function(){
      setHelp("Import presets JSON.");
      importPresets();
    };
    btnSchemaMain.onClick = function(){
      setHelp("Export Blueprint MB.");
      exportBlueprintMBCSV();
    };
    btnAgentMain.onClick = function(){
      setHelp("Export de tout le contexte utile pour l'agent IA.");
      exportAgentPack();
    };
    btnStackAnchor.onClick = function(){
      setHelp("Création ou sélection de l'ancre de pile.");
      createOrSelectStackAnchorAction();
    };
    btnResetMain.onClick = function(){
      setHelp("Réinitialisation de la bibliothèque.");
      resetPresetLibraryWithBackup();
    };
    btnHistoryMain.onClick = function(){
      setHelp("Consultation de l'historique.");
      var msg = history.length ? history.join("\n") : "Aucune action enregistree.";
      alert("Historique (10 max):\n\n" + msg);
    };
    btnRepairUI.onClick = function(){
      setHelp("Réparation UI en cours.");
      repairUIState();
    };

    edSearch.onChanging = function(){ refreshPresetListCurrent(); };
    chkFavOnly.onClick = function(){
      favoritesOnly = !!chkFavOnly.value;
      saveSetting(PREF_SEC, "favoritesOnly", favoritesOnly ? "1" : "0");
      refreshPresetListCurrent();
    };

    btnAddCat.onClick = addCategory;
    btnRenCat.onClick = renameCategory;
    btnDelCat.onClick = deleteCategory;

    catTabs.onChange = function(){
      if(uiLocked) return;
      if(catTabs.selection === null || catTabs.selection === undefined) return;
      var idx = getSelectedTabIndex(catTabs);
      if(idx < 0) return;
      dbg("catTabs.onChange idx=" + idx + " prevSelected=" + db.selectedCategory);
      db.selectedCategory = idx;
      db.selectedPresetId = "";
      save();
      renderCategoryContent();
      updateGuide(1);
      updateIndicators();
    };
    wrapHandler(btnPlaceMain, "onClick", "main-poser");
    wrapHandler(btnApplyAll, "onClick", "main-applyall");
    wrapHandler(btnCleanMk, "onClick", "main-cleanmk");
    wrapHandler(btnCleanAuto, "onClick", "main-cleanauto");
    wrapHandler(btnCsvQuick, "onClick", "main-csv");
    wrapHandler(btnStackAnchor, "onClick", "main-stack-anchor");
    wrapHandler(btnMediaMain, "onClick", "main-media");
    wrapHandler(btnExportMain, "onClick", "main-export");
    wrapHandler(btnImportMain, "onClick", "main-import");
    wrapHandler(btnSchemaMain, "onClick", "main-schema");
    wrapHandler(btnAgentMain, "onClick", "main-agent-pack");
    wrapHandler(btnResetMain, "onClick", "main-reset");
    wrapHandler(btnHistoryMain, "onClick", "main-history");
    wrapHandler(btnRepairUI, "onClick", "main-repair");
    wrapHandler(edSearch, "onChanging", "main-recherche");
    wrapHandler(chkFavOnly, "onClick", "main-favoris");
    wrapHandler(btnAddCat, "onClick", "cat-add");
    wrapHandler(btnRenCat, "onClick", "cat-ren");
    wrapHandler(btnDelCat, "onClick", "cat-del");
    wrapHandler(catTabs, "onChange", "cat-switch");

    rebuildCategoryTabs();
    applyGlobalCompactUI();
    renderCategoryContent();
    updateGuide(1);
    updateIndicators();

    safeRelayout();
    win.onResizing = win.onResize = function(){ safeRelayout(); };
    return win;
  }

  if($.global[STARTUP_LOCK_KEY]) return;
  $.global[STARTUP_LOCK_KEY] = true;
  try{
    var panel = buildUI(thisObj);
    if(panel instanceof Window){
      panel.center();
      panel.show();
    }
  }catch(e){
    alert("Erreur Marker Builder 2 : " + e.toString() + (e.line ? (" (ligne " + e.line + ")") : ""));
  }finally{
    $.global[STARTUP_LOCK_KEY] = false;
  }

})(this);

