import { trim, toNum } from '../core/utils.js';
import { TAG_GRID_GUIDE, activeComp } from '../core/ae-bridge.js';
import { loadGridLayoutConfig, saveGridLayoutConfig, defaultGridLayoutConfig, sanitizeGridLayoutConfig } from '../core/settings.js';

var gridLayoutWin = null;

export function removeGridPreviewLayers(comp){
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

export function addGridPreviewLayers(comp, cfgOverride, showCenters){
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

export function toggleGridPreview(setStatus){
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

export function openGridLayoutWindow(setStatus){
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
