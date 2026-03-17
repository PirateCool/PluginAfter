import { trim, toNum, parseJSON, stringifyJSON } from '../core/utils.js';
import { parseCSVRaw, detectCsvMapping } from '../core/csv-parser.js';
import { activeComp } from '../core/ae-bridge.js';
import { validateCsvRows, csvReportSummary, saveCsvLogDialog, executeCsvReport } from '../core/csv-import.js';

export function runCsvWizard(parsed, comp, sourceName, db, mediaDB, setStatus){
  var headers = parsed.headers || [];
  var autoMap = detectCsvMapping(headers);
  var map = parseJSON(stringifyJSON(autoMap));
  var strictBlueprintMode = true;
  var report = validateCsvRows(parsed, comp, map, { strictBlueprint: strictBlueprintMode }, db, mediaDB);

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
    out.push("Aper\u00E7u CSV (premi\u00E8res lignes):");
    if(!hs.length){
      out.push("(Aucune colonne d\u00E9tect\u00E9e)");
      return out.join("\n");
    }
    out.push(shownHeaders.join(" | "));
    if(hs.length > shownHeaders.length) out.push("(+" + (hs.length - shownHeaders.length) + " colonnes masqu\u00E9es)");
    out.push("----------------------------------------");
    for(var i=0; i<n; i++){
      var row = rs[i];
      var cells = [];
      for(var j=0; j<shownHeaders.length; j++) cells.push(cropCell(row[shownHeaders[j]]));
      out.push("L" + (row.__line || (i + 2)) + " : " + cells.join(" | "));
    }
    if(rs.length > n) out.push("... (" + (rs.length - n) + " ligne(s) suppl\u00E9mentaire(s))");
    return out.join("\n");
  }

  var dlg = new Window("dialog", "CSV - Assistant import (4 \u00E9tapes)", undefined, { resizeable: true });
  dlg.orientation = "column";
  dlg.alignChildren = ["fill", "top"];
  dlg.margins = 10;
  dlg.spacing = 8;
  dlg.minimumSize = [640, 500];

  var stepTitle = dlg.add("statictext", undefined, "\u00C9tape 1/4 - Source");
  var stack = dlg.add("group");
  stack.orientation = "stack";
  stack.preferredSize = [680, 460];
  stack.minimumSize = [620, 400];
  stack.alignChildren = ["fill", "fill"];

  var p1 = stack.add("panel", undefined, "1) Source CSV");
  p1.orientation = "column";
  p1.alignChildren = ["fill", "top"];
  var p1Guide = p1.add("statictext", undefined, "Tutoriel: v\u00E9rifie ici que le bon fichier CSV est charg\u00E9 (nom, colonnes, nombre de lignes), puis clique sur 'Suivant'.", { multiline: true });
  p1Guide.characters = 98;
  var s1 = "Fichier: " + (sourceName || "(inconnu)") + "\n";
  s1 += "Colonnes d\u00E9tect\u00E9es: " + headers.length + "\n";
  s1 += "Lignes d\u00E9tect\u00E9es: " + parsed.rows.length + "\n\n";
  var colsPreview = headers.slice(0, Math.min(headers.length, 16));
  s1 += "Colonnes (aper\u00E7u):\n" + (colsPreview.length ? ("- " + colsPreview.join("\n- ")) : "(aucune)");
  if(headers.length > colsPreview.length) s1 += "\n... (+" + (headers.length - colsPreview.length) + " colonnes)";
  var p1Txt = p1.add("edittext", undefined, s1, { multiline: true, readonly: true });
  p1Txt.minimumSize = [600, 120];
  var p1Preview = p1.add("edittext", undefined, buildCsvPreviewText(parsed, 8), { multiline: true, readonly: true });
  p1Preview.minimumSize = [600, 220];
  p1Preview.helpTip = "Visualisateur CSV: aper\u00E7u des premi\u00E8res lignes pour v\u00E9rifier rapidement les donn\u00E9es.";
  var p1Btns = p1.add("group");
  p1Btns.orientation = "row";
  var p1Next = p1Btns.add("button", undefined, "Suivant >");
  var p1Cancel = p1Btns.add("button", undefined, "Annuler");

  var p2 = stack.add("panel", undefined, "2) Mapping colonnes");
  p2.orientation = "column";
  p2.alignChildren = ["fill", "top"];
  var p2Guide = p2.add("statictext", undefined, "Tutoriel: associe chaque champ important \u00E0 la bonne colonne CSV. IN et Template sont obligatoires. OUT est optionnel (si pr\u00E9sent, il d\u00E9finit la dur\u00E9e).", { multiline: true });
  p2Guide.characters = 98;
  var p2Hint = p2.add("statictext", undefined, "Ajuste le mapping. '(auto)' utilise la d\u00E9tection intelligente.");
  p2Hint.helpTip = "Associe manuellement une colonne CSV \u00E0 un champ plugin.";
  var p2Strict = p2.add("checkbox", undefined, "Mode strict Blueprint (recommand\u00E9)");
  p2Strict.value = true;
  p2Strict.helpTip = "Emp\u00EAche l'utilisation de presets/templates hors Blueprint et bloque les incoh\u00E9rences.";
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
    { key: "bullets", label: "Bullets (s\u00E9par\u00E9s par |)" },
    { key: "preset", label: "Preset" },
    { key: "category", label: "Cat\u00E9gorie" },
    { key: "text_slots", label: "Text slots" },
    { key: "image_slots", label: "Image slots" },
    { key: "dur", label: "Dur\u00E9e" },
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

  var p3 = stack.add("panel", undefined, "3) V\u00E9rification");
  p3.orientation = "column";
  p3.alignChildren = ["fill", "top"];
  var p3Guide = p3.add("statictext", undefined, "Tutoriel: lis le diagnostic (valides, erreurs, warnings). Corrige le mapping si besoin jusqu'\u00E0 obtenir le r\u00E9sultat attendu.", { multiline: true });
  p3Guide.characters = 98;
  var p3Txt = p3.add("edittext", undefined, "", { multiline: true, readonly: true });
  p3Txt.minimumSize = [600, 320];
  var p3Btns = p3.add("group");
  p3Btns.orientation = "row";
  var p3Back = p3Btns.add("button", undefined, "< Retour");
  var p3Refresh = p3Btns.add("button", undefined, "\u21BB Re-v\u00E9rifier");
  var p3Next = p3Btns.add("button", undefined, "Suivant >");
  var p3Cancel = p3Btns.add("button", undefined, "Annuler");

  var p4 = stack.add("panel", undefined, "4) Ex\u00E9cution");
  p4.orientation = "column";
  p4.alignChildren = ["fill", "top"];
  var p4Guide = p4.add("statictext", undefined, "Tutoriel: lance d'abord 'Dry-run' pour simuler sans modifier le projet. Si tout est correct, clique sur 'Ex\u00E9cuter'.", { multiline: true });
  p4Guide.characters = 98;
  var p4Txt = p4.add("edittext", undefined, "", { multiline: true, readonly: true });
  p4Txt.minimumSize = [600, 320];
  var p4Btns = p4.add("group");
  p4Btns.orientation = "row";
  var p4Back = p4Btns.add("button", undefined, "< Retour");
  var p4Dry = p4Btns.add("button", undefined, "Dry-run");
  var p4Run = p4Btns.add("button", undefined, "Ex\u00E9cuter");
  var p4Log = p4Btns.add("button", undefined, "\uD83D\uDCBE Rapport");
  var p4Cancel = p4Btns.add("button", undefined, "Annuler");

  function refreshVerification(){
    map = collectMap();
    strictBlueprintMode = !!p2Strict.value;
    report = validateCsvRows(parsed, comp, map, { strictBlueprint: strictBlueprintMode }, db, mediaDB);
    p3Txt.text = csvReportSummary(report, comp);
  }
  function refreshExecutionSummary(){
    var m = "Pr\u00EAt \u00E0 lancer l'import.\n\n";
    m += csvReportSummary(report, comp);
    m += "\nActions:\n- Dry-run: aucune cr\u00E9ation\n- Ex\u00E9cuter: cr\u00E9e les lignes valides";
    p4Txt.text = m;
    p4Run.enabled = report.jobs.length > 0;
  }
  function setStep(n){
    p1.visible = (n === 1);
    p2.visible = (n === 2);
    p3.visible = (n === 3);
    p4.visible = (n === 4);
    stepTitle.text = "\u00C9tape " + n + "/4 - " + (n === 1 ? "Source" : (n === 2 ? "Mapping" : (n === 3 ? "V\u00E9rification" : "Ex\u00E9cution")));
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
    setStatus("\uD83D\uDCC4 Dry-run CSV termin\u00E9. Valides: " + report.jobs.length + ", erreurs: " + report.errors.length);
    alert("Dry-run CSV termin\u00E9.\nValides: " + report.jobs.length + "\nErreurs: " + report.errors.length + "\nWarnings: " + report.warnings.length);
    if(confirm("Exporter le rapport dry-run en .txt ?")) saveCsvLogDialog(report, null, "dry-run");
    refreshExecutionSummary();
  };
  p4Run.onClick = function(){
    var stats = executeCsvReport(report, comp, setStatus);
    if(confirm("Exporter le rapport d'ex\u00E9cution en .txt ?")) saveCsvLogDialog(report, stats, "run");
    refreshVerification();
    refreshExecutionSummary();
  };
  p4Log.onClick = function(){ saveCsvLogDialog(report, null, "verification"); };
  p4Cancel.onClick = function(){ dlg.close(); };

  setStep(1);
  dlg.show();
}

export function runCsvImport(db, mediaDB, setStatus){
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
    runCsvWizard(parsed, comp, f.name, db, mediaDB, setStatus);
  }catch(e){
    try{ f.close(); }catch(_e){}
    alert("Erreur import CSV: " + e.toString());
  }
}

export function runCsvDirectImport(forceCheckAll, db, mediaDB, setStatus){
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
      checkAll = confirm("CSV direct:\nOui = check complet avant ex\u00E9cution\nNon = ex\u00E9cuter rapidement (lignes invalides ignor\u00E9es).");
    }
    var map = detectCsvMapping(parsed.headers || []);
    var report = validateCsvRows(parsed, comp, map, { strictBlueprint: true }, db, mediaDB);
    if(checkAll && report.errors.length > 0){
      alert("Check complet: erreurs d\u00E9tect\u00E9es, ex\u00E9cution bloqu\u00E9e.\nErreurs: " + report.errors.length + "\nWarnings: " + report.warnings.length);
      if(confirm("Exporter le rapport de v\u00E9rification ?")) saveCsvLogDialog(report, null, "verification");
      return;
    }
    if(!checkAll && report.errors.length > 0){
      if(!confirm("CSV direct: " + report.errors.length + " ligne(s) invalide(s) seront ignor\u00E9es.\nContinuer avec " + report.jobs.length + " ligne(s) valide(s) ?")) return;
    }
    if(report.jobs.length === 0){
      alert("Aucune ligne valide \u00E0 ex\u00E9cuter.");
      return;
    }
    var stats = executeCsvReport(report, comp, setStatus);
    if(confirm("Exporter le rapport d'ex\u00E9cution en .txt ?")) saveCsvLogDialog(report, stats, "run-direct");
  }catch(e){
    try{ f.close(); }catch(_e){}
    alert("Erreur CSV direct: " + e.toString());
  }
}
