import { trim, toNum, normalizeKey } from '../core/utils.js';
import { loadMediaDB, saveMediaDB } from '../core/ae-bridge.js';
import { writeTextFile, buildMediaCatalogCsv, buildMediaCatalogTxt, buildMediaCatalogShortTxt } from '../core/export.js';

export function openMediaDbWindow(mediaDB, saveMediaDBFn, setStatus){
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
    saveMediaDBFn(mediaDB);
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
    saveMediaDBFn(mediaDB);
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
    saveMediaDBFn(mediaDB);
    refreshGroups();
    refresh();
  };
  bClose.onClick = function(){ w.close(); };

  refreshGroups();
  refresh();
  w.show();
}
