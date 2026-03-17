// core/export.js — export / agent pack functions

import { trim, toNum, stringifyJSON } from './utils.js';
import { csvCell, csvLine } from './csv-parser.js';
import { getPresetFamily } from './presets.js';

export function writeTextFile(fileObj, text){
  fileObj.encoding = "UTF-8";
  if(!fileObj.open("w")) throw new Error("Ouverture ecriture impossible.");
  fileObj.write(String(text || ""));
  fileObj.close();
}

export function mediaCatalogRows(mediaDbObj){
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

export function buildPresetCatalogTxt(db){
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

export function buildMediaCatalogCsv(mediaDbObj){
  var rows = mediaCatalogRows(mediaDbObj);
  var lines = [csvLine(["image_key","filename","full_path","exists"])];
  for(var i=0; i<rows.length; i++) lines.push(csvLine([rows[i].key, rows[i].filename, rows[i].path, rows[i].exists]));
  return lines.join("\n");
}

export function buildMediaCatalogTxt(mediaDbObj){
  var rows = mediaCatalogRows(mediaDbObj);
  var lines = ["Media Catalog MB2", "", "Utiliser uniquement ces image_key réelles :", ""];
  for(var i=0; i<rows.length; i++) lines.push("- " + rows[i].key + " -> " + rows[i].filename);
  return lines.join("\n");
}

export function buildMediaCatalogShortTxt(mediaDbObj, maxCount){
  var rows = mediaCatalogRows(mediaDbObj);
  var limit = Math.max(1, parseInt(toNum(maxCount, rows.length), 10));
  if(rows.length > limit) rows = rows.slice(0, limit);
  var lines = ["Media Keys MB2 - Short", "", "Utiliser uniquement ces image_key exactes:"];
  for(var i=0; i<rows.length; i++) lines.push("- " + rows[i].key);
  return lines.join("\n");
}

export function buildCsvTemplateAgent(){
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

export function buildAgentInstructionsText(){
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

export function buildTemplateContractText(){
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

export function buildAgentReadmeText(){
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

export function exportBlueprintMBCSV(db, csvLine, setStatus){
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

export function exportAgentPack(db, mediaDB, setStatus){
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
    writeTextFile(new File(pack.fsName + "\\Preset_Catalog.txt"), buildPresetCatalogTxt(db));
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

export function exportPresets(db, stringifyJSON, setStatus){
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
