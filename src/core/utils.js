// core/utils.js — shared utility functions

export var MB2_DEBUG = false;

export function mb2Log(level, msg){
  if(!MB2_DEBUG && level === "debug") return;
  try{ $.writeln("[MB2:" + level + "] " + msg); }catch(_e){}
}

export function trim(s){ return (s || "").replace(/^\s+|\s+$/g, ""); }

export function toNum(v, def){ var n = parseFloat(v); return isNaN(n) ? def : n; }

export function escStr(s){
  return String(s)
    .replace(/\\/g, "\\\\")
    .replace(/"/g, "\\\"")
    .replace(/\r/g, "\\r")
    .replace(/\n/g, "\\n")
    .replace(/\t/g, "\\t");
}

export function stringifyJSON(v){
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

export function parseJSON(s){
  var _json = { pos: 0, src: String(s || "") };
  function _skipWS(){
    while(_json.pos < _json.src.length){
      var c = _json.src.charAt(_json.pos);
      if(c === " " || c === "\t" || c === "\r" || c === "\n") _json.pos++;
      else break;
    }
  }
  function _peek(){ return _json.pos < _json.src.length ? _json.src.charAt(_json.pos) : ""; }
  function _next(){ return _json.pos < _json.src.length ? _json.src.charAt(_json.pos++) : ""; }
  function _expect(ch){
    _skipWS();
    if(_next() !== ch) throw new Error("JSON parse: expected '" + ch + "' at pos " + (_json.pos - 1));
  }
  function _parseString(){
    _expect("\"");
    var out = "";
    while(_json.pos < _json.src.length){
      var c = _next();
      if(c === "\"") return out;
      if(c === "\\"){
        var e = _next();
        if(e === "\"") out += "\"";
        else if(e === "\\") out += "\\";
        else if(e === "/") out += "/";
        else if(e === "n") out += "\n";
        else if(e === "r") out += "\r";
        else if(e === "t") out += "\t";
        else if(e === "b") out += "\b";
        else if(e === "f") out += "\f";
        else if(e === "u"){
          var hex = _json.src.substr(_json.pos, 4);
          _json.pos += 4;
          out += String.fromCharCode(parseInt(hex, 16));
        }
        else out += e;
      }else{
        out += c;
      }
    }
    throw new Error("JSON parse: unterminated string");
  }
  function _parseNumber(){
    var start = _json.pos;
    if(_peek() === "-") _json.pos++;
    while(_json.pos < _json.src.length && "0123456789".indexOf(_json.src.charAt(_json.pos)) >= 0) _json.pos++;
    if(_peek() === "."){
      _json.pos++;
      while(_json.pos < _json.src.length && "0123456789".indexOf(_json.src.charAt(_json.pos)) >= 0) _json.pos++;
    }
    if(_peek() === "e" || _peek() === "E"){
      _json.pos++;
      if(_peek() === "+" || _peek() === "-") _json.pos++;
      while(_json.pos < _json.src.length && "0123456789".indexOf(_json.src.charAt(_json.pos)) >= 0) _json.pos++;
    }
    return parseFloat(_json.src.substring(start, _json.pos));
  }
  function _parseLiteral(word, value){
    for(var i = 0; i < word.length; i++){
      if(_next() !== word.charAt(i)) throw new Error("JSON parse: expected '" + word + "'");
    }
    return value;
  }
  function _parseValue(){
    _skipWS();
    var c = _peek();
    if(c === "\"") return _parseString();
    if(c === "{") return _parseObject();
    if(c === "[") return _parseArray();
    if(c === "t") return _parseLiteral("true", true);
    if(c === "f") return _parseLiteral("false", false);
    if(c === "n") return _parseLiteral("null", null);
    if(c === "-" || (c >= "0" && c <= "9")) return _parseNumber();
    throw new Error("JSON parse: unexpected char '" + c + "' at pos " + _json.pos);
  }
  function _parseArray(){
    _expect("[");
    var arr = [];
    _skipWS();
    if(_peek() === "]"){ _json.pos++; return arr; }
    while(true){
      arr.push(_parseValue());
      _skipWS();
      if(_peek() === "]"){ _json.pos++; return arr; }
      _expect(",");
    }
  }
  function _parseObject(){
    _expect("{");
    var obj = {};
    _skipWS();
    if(_peek() === "}"){ _json.pos++; return obj; }
    while(true){
      _skipWS();
      var key = _parseString();
      _skipWS();
      _expect(":");
      obj[key] = _parseValue();
      _skipWS();
      if(_peek() === "}"){ _json.pos++; return obj; }
      _expect(",");
    }
  }
  var result = _parseValue();
  return result;
}

export function normalizeKey(s){
  return trim(String(s || "")).toLowerCase().replace(/\s+/g, "_");
}

export function makeId(){
  var t = (new Date()).getTime().toString(16);
  var r = Math.floor(Math.random() * 0xFFFFFF).toString(16);
  return (t + "_" + r).toUpperCase();
}

export function clamp01(v){
  var n = toNum(v, 0);
  if(n < 0) n = 0;
  if(n > 1) n = 1;
  return n;
}

export function clampInt(v, minV, maxV, defV){
  var n = parseInt(toNum(v, defV), 10);
  if(isNaN(n)) n = defV;
  if(n < minV) n = minV;
  if(n > maxV) n = maxV;
  return n;
}

export function pad3(n){ n = Math.max(0, parseInt(n,10) || 0); return (n<10?"00":(n<100?"0":"")) + n; }
