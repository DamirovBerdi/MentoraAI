const fs = require('fs');
const path = require('path');

class KeyManager {
  constructor(options = {}){
    this.dir = options.dir || path.join(__dirname, '..');
    this.indexFile = path.join(this.dir, 'gemini_key_index.json');
    this.stateFile = path.join(this.dir, 'gemini_key_state.json');
    this.keys = this._loadKeysFromEnv();
    this._ensureState();
  }

  _loadKeysFromEnv(){
    // Strict format: GEMINI_API_KEY_1 .. GEMINI_API_KEY_9
    const keys = [];
    for(let i=1;i<=9;i++){
      const k = process.env[`GEMINI_API_KEY_${i}`];
      if(k && String(k).trim()) keys.push(String(k).trim());
    }
    return keys;
  }

  _ensureState(){
    try{ if(!fs.existsSync(this.stateFile)) fs.writeFileSync(this.stateFile, JSON.stringify({},null,2),'utf8'); }catch(e){}
    try{ if(!fs.existsSync(this.indexFile)) fs.writeFileSync(this.indexFile, JSON.stringify({ index: 0 },null,2),'utf8'); }catch(e){}
  }

  _readIndex(){
    try{ const j = JSON.parse(fs.readFileSync(this.indexFile,'utf8')||'{}'); return Number.isFinite(j.index)? j.index: 0; }catch(e){ return 0; }
  }
  _writeIndex(i){ try{ fs.writeFileSync(this.indexFile, JSON.stringify({ index: i },null,2),'utf8'); }catch(e){} }

  _readState(){ try{ return JSON.parse(fs.readFileSync(this.stateFile,'utf8')||'{}'); }catch(e){ return {}; } }
  _writeState(s){ try{ fs.writeFileSync(this.stateFile, JSON.stringify(s||{},null,2),'utf8'); }catch(e){} }

  hasKeys(){ return Array.isArray(this.keys) && this.keys.length>0; }

  // Return next available key (skipping keys in cooldown). Returns { key, idx } or null
  getNextKey(){
    if(!this.hasKeys()) return null;
    const now = Date.now();
    const state = this._readState();
    const active = this.keys.map((k,i)=>({ key:k, idx:i })).filter(ent => {
      const s = state[ent.key];
      if(!s) return true;
      if(s.disabledUntil && Number(s.disabledUntil) > now) return false;
      return true;
    });
    const tryList = active.length ? active : this.keys.map((k,i)=>({ key:k, idx:i }));
    let start = this._readIndex() || 0;
    const pick = tryList[(start) % tryList.length];
    // advance index for next time
    this._writeIndex((pick.idx + 1) % this.keys.length);
    return pick || null;
  }

  // mark key into cooldown for ms milliseconds
  markCooldown(key, ms){
    try{
      const state = this._readState();
      state[key] = state[key] || {};
      state[key].disabledUntil = Date.now() + Number(ms || (10 * 60 * 1000));
      this._writeState(state);
    }catch(e){}
  }

  // mark invalid key (long disable, 24h)
  markInvalid(key){
    try{
      const state = this._readState();
      state[key] = state[key] || {};
      state[key].disabledUntil = Date.now() + (24 * 60 * 60 * 1000);
      this._writeState(state);
    }catch(e){}
  }
}

module.exports = KeyManager;
