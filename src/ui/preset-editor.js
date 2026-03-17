import { trim, toNum } from '../core/utils.js';
import { LABELS, getPresetFamily } from '../core/presets.js';
import { invalidateModelCompListCache, listModelCompsFiltered, detectTemplateFieldSchema, auditTemplateContract, buildTemplateAuditText } from '../core/ae-bridge.js';

export var SPAWN_ITEMS = [
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

export function spawnIndexByKey(key){
  var wanted = trim(key || "").toLowerCase();
  for(var si=0; si<SPAWN_ITEMS.length; si++) if(SPAWN_ITEMS[si].k === wanted) return si;
  return 0;
}

export function spawnKeyFromSelection(ddSpawnAnchor){
  if(!ddSpawnAnchor.selection) return "middle_right";
  return SPAWN_ITEMS[ddSpawnAnchor.selection.index].k;
}

export function layoutIndexByKey(key){
  var k = trim(key || "").toLowerCase();
  if(k === "stack_anchor") return 0;
  if(k === "manual") return 1;
  if(k === "fullscreen") return 2;
  return 0;
}

export function layoutKeyFromSelection(ddLayoutMode){
  if(!ddLayoutMode.selection) return "stack_anchor";
  if(ddLayoutMode.selection.index === 1) return "manual";
  if(ddLayoutMode.selection.index === 2) return "fullscreen";
  return "stack_anchor";
}

export function labelIndexByValue(v){ for(var i=0; i<LABELS.length; i++) if(LABELS[i].i === v) return i; return -1; }

export function openPresetEditorPopup(selectedPreset, save, refreshPresetList, setStatus){
  if(!selectedPreset){ alert("Selectionne un preset."); return; }
  var dlg = new Window("dialog", "\u00C9diteur preset - " + selectedPreset.name, undefined, { resizeable: true });
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
  var bRefreshTpl = gModel.add("button", undefined, "\uD83D\uDD04");
  var bAuditTpl = gModel.add("button", undefined, "\uD83E\uDDEA");
  for(var mi=0; mi<ddTpl.items.length; mi++) if(ddTpl.items[mi].text === selectedPreset.modelComp){ ddTpl.selection = mi; break; }

  var gLine1 = dlg.add("group"); gLine1.orientation = "row";
  gLine1.add("statictext", undefined, "Dur\u00E9e");
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
  var bAutoSlots = gSlots.add("button", undefined, "\uD83D\uDD0E Auto");

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
    setStatus("\uD83D\uDEE0 Preset mis \u00E0 jour");
    dlg.close(1);
  };
  dlg.layout.layout(true);
  dlg.show();
}

export function openTemplateAuditAction(templateName){
  var tpl = trim(templateName || "");
  if(!tpl){
    alert("Choisis d'abord un template.");
    return;
  }
  alert(buildTemplateAuditText(auditTemplateContract(tpl)));
}
