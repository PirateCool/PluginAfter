// core/presets.js — preset data model, defaults, sanitization

import { trim, toNum, makeId } from './utils.js';

export var LABELS = [
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

export function nextAutoLabel(db){
  var seq = [9,2,10,11,12,13,14,15];
  var idx = db.autoColorIndex || 0;
  var val = seq[idx % seq.length];
  db.autoColorIndex = (idx + 1) % seq.length;
  return val;
}

export function builtinPresetProfile(name){
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

export function getPresetFamily(preset){
  var raw = trim((preset && preset.family) || "").toLowerCase();
  if(raw === "visual") return "visual";
  return "text";
}

export function presetDefaults(name, db){
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

export function sanitizePreset(p, db){
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

export function defaultDB(){
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

export function sanitizeDB(db){
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
