// core/csv-import.js — CSV import/validation logic extracted from Marker Builder 2.jsx

import { trim, toNum, mb2Log, parseJSON, stringifyJSON, normalizeKey } from './utils.js';
import { pickCsvValue, detectCsvMapping, parseTimecodeToSeconds, parseCsvTimeFlexible } from './csv-parser.js';
import { presetDefaults, getPresetFamily, sanitizePreset } from './presets.js';
import { findCompByName, activeComp, detectTemplateFieldSchema, auditTemplateContract } from './ae-bridge.js';
import { placePresetAtTime, ensurePlacementRuntimeCache, clearPlacementRuntimeCache } from './placement.js';

export function findPresetByNameInDB(name, categoryName, db){
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

export function pickCsvValueByMapping(row, field, mapping){
  if(mapping && mapping[field]){
    var k = normalizeKey(mapping[field]);
    if(row && row[k] !== undefined && row[k] !== null) return trim(row[k]);
    return "";
  }
  return pickCsvValue(row, field);
}

export function buildCsvPresetFromRow(row, mapping, db){
  var presetName = pickCsvValueByMapping(row, "preset", mapping);
  var catName = pickCsvValueByMapping(row, "category", mapping);
  var template = pickCsvValueByMapping(row, "template", mapping);
  var base = presetName ? findPresetByNameInDB(presetName, catName, db) : null;
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

export function extractBulletTexts(row, mapping){
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

export function extractBulletCueEntries(row, fps, baseTime){
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

export function extractIndexedValues(row, prefix, maxCount){
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

export function resolveCsvImagePath(row, mapping, mediaDB){
  var direct = pickCsvValueByMapping(row, "image", mapping);
  if(direct) return { path: direct, source: "path" };
  var key = pickCsvValueByMapping(row, "image_key", mapping);
  if(key && mediaDB[key]) return { path: trim(mediaDB[key] || ""), source: "key", key: key };
  return { path: "", source: key ? "key-missing" : "none", key: key };
}

export function resolveCsvImagePaths(row, mapping, mediaDB){
  var out = [];
  var main = resolveCsvImagePath(row, mapping, mediaDB);
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

export function validateCsvRows(parsed, comp, mappingOverride, opts, db, mediaDB){
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
    var presetRef = presetName ? findPresetByNameInDB(presetName, catName, db) : null;
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
    var imageItems = resolveCsvImagePaths(r, mapping, mediaDB);
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
    var preset = buildCsvPresetFromRow(r, mapping, db);
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

export function csvReportSummary(report, comp){
  var msg = "Import CSV - Aperçu\n\n";
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

export function buildCsvLogText(report, stats, modeLabel){
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

export function saveCsvLogDialog(report, stats, modeLabel){
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

export function applyCsvTextToInstance(instanceComp, textValue, bulletTexts, textList, slotLimit, bulletCues, baseCompTime, clipDuration){
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

export function ensureCsvFootageFromPath(path, cache){
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

export function applyCsvImageToInstance(instanceComp, imageItems, footageCache, slotLimit){
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

export function executeCsvReport(report, comp, setStatus){
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
        mb2Log("error", "CSV exec line " + job.line + ": " + _eCsv);
        stats.details.push("Ligne " + job.line + ": ECHEC execution - " + _eCsv);
      }
      if(ok) stats.created++; else stats.failed++;
    }
    if(setStatus) setStatus("CSV import terminé. Créés: " + stats.created + ", échecs: " + stats.failed + ", erreurs source: " + report.errors.length);
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
