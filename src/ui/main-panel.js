import { trim, toNum, mb2Log, parseJSON, stringifyJSON, normalizeKey, makeId } from '../core/utils.js';
import { PREF_SEC, getSetting, saveSetting } from '../core/settings.js';
import { parseCSVRaw, detectCsvMapping, csvCell, csvLine } from '../core/csv-parser.js';
import { LABELS, nextAutoLabel, getPresetFamily, presetDefaults, sanitizePreset, sanitizeDB, defaultDB } from '../core/presets.js';
import { TAG_MK, TAG_LAYER, activeComp, ensureStackAnchor, findStackAnchorLayer, findCompByName, invalidateModelCompListCache, listModelCompsFiltered, buildMarkerComment, addMarker, detectTemplateFieldSchema, auditTemplateContract, buildTemplateAuditText, loadDB, saveDB, loadMediaDB, saveMediaDB, sanitizeMediaDB, cleanPluginMarkers, cleanupAutoLayers } from '../core/ae-bridge.js';
import { placePresetAtCTI, applyAllPluginMarkers } from '../core/placement.js';
import { validateCsvRows, csvReportSummary, saveCsvLogDialog, executeCsvReport, findPresetByNameInDB } from '../core/csv-import.js';
import { writeTextFile, buildPresetCatalogTxt, buildMediaCatalogCsv, buildMediaCatalogTxt, buildMediaCatalogShortTxt, buildCsvTemplateAgent, buildAgentInstructionsText, buildTemplateContractText, buildAgentReadmeText } from '../core/export.js';
import { openMediaDbWindow } from './media-db.js';
import { runCsvImport, runCsvDirectImport } from './csv-wizard.js';
import { openGridLayoutWindow } from './grid-layout.js';
import { SPAWN_ITEMS, spawnIndexByKey, spawnKeyFromSelection, layoutIndexByKey, layoutKeyFromSelection, labelIndexByValue, openPresetEditorPopup, openTemplateAuditAction } from './preset-editor.js';

export function buildUI(thisObj){
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
      sCSV.onClick = function(){ runCsvImport(db, mediaDB, setStatus); };
      sMedia.onClick = function(){ openMediaDbWindow(mediaDB, function(m){ saveMediaDB(m); }, setStatus); };
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
        selectedPreset.spawnAnchor = spawnKeyFromSelection(ddSpawnAnchor);
        selectedPreset.spawnOffsetX = toNum(fieldText(edSpawnX), selectedPreset.spawnOffsetX);
        selectedPreset.spawnOffsetY = toNum(fieldText(edSpawnY), selectedPreset.spawnOffsetY);
        selectedPreset.layoutMode = layoutKeyFromSelection(ddLayoutMode);
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
      btnToggleEditor.onClick = function(){
        setHelp("Ouvre l'éditeur preset en popup.");
        openPresetEditorPopup(selectedPreset, save, refreshPresetList, setStatus);
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
      runCsvImport(db, mediaDB, setStatus);
    };
    btnMediaMain.onClick = function(){
      setHelp("Gestion de la base médias.");
      openMediaDbWindow(mediaDB, function(m){ saveMediaDB(m); }, setStatus);
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
