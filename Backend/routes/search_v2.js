const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const FLASH_FILE = path.join(__dirname, '..', 'flashcards_db.json');
const ACT_FILE = path.join(__dirname, '..', 'activity_db.json');

function saveGeneratedFlashcards(user, cards){
  try{
    let all = {};
    try{ if(fs.existsSync(FLASH_FILE)) all = JSON.parse(fs.readFileSync(FLASH_FILE,'utf8')||'{}'); }catch(e){ all = {}; }
    all[user] = all[user] || { cards: [] };
    const now = Date.now();
    const gen = (cards||[]).map((c,i)=>({ id: (now+i).toString(36)+'-'+Math.floor(Math.random()*10000), front: c.front, back: c.back, ts: now }));
    all[user].cards = gen.concat(all[user].cards || []);
    if(all[user].cards.length > 1000) all[user].cards = all[user].cards.slice(0,1000);
    fs.writeFileSync(FLASH_FILE, JSON.stringify(all, null, 2), 'utf8');
  }catch(e){ console.error('saveGeneratedFlashcards failed', e && e.message); }
}

function saveSearchForUser(user, query, answer){
  try{
    const act = (fs.existsSync(ACT_FILE) ? JSON.parse(fs.readFileSync(ACT_FILE,'utf8')||'{}') : {});
    act[user] = act[user] || {};
    act[user].history = act[user].history || [];
    act[user].history.unshift({ query: query, answer: answer || '', ts: Date.now() });
    if(act[user].history.length > 100) act[user].history = act[user].history.slice(0,100);
    fs.writeFileSync(ACT_FILE, JSON.stringify(act, null, 2), 'utf8');
  }catch(e){ console.error('saveSearchForUser failed', e && e.message); }
}

// fetch function
let fetchFn = (global && global.fetch) ? global.fetch : null;
try{ if(!fetchFn) fetchFn = require('node-fetch'); }catch(e){}

// Key persistence
const KEY_INDEX_FILE = path.join(__dirname, '..', 'gemini_key_index.json');
const KEY_STATE_FILE = path.join(__dirname, '..', 'gemini_key_state.json');
function loadGeminiKeys(){
  const envList = process.env.GEMINI_API_KEYS || process.env.GOOGLE_API_KEYS || process.env.GOOGLE_API_KEY;
  if(envList && String(envList).trim()) return String(envList).split(',').map(s=>s.trim()).filter(Boolean);
  const keys = [];
  Object.keys(process.env).forEach(k=>{ const m=k.match(/^GEMINI_API_KEY_(\d+)$/); if(m){ keys.push({ idx: Number(m[1]), key: process.env[k] }); } });
  if(keys.length){ keys.sort((a,b)=>a.idx-b.idx); return keys.map(x=>String(x.key).trim()).filter(Boolean); }
  return [];
}
function readIndex(){ try{ if(fs.existsSync(KEY_INDEX_FILE)){ const j = JSON.parse(fs.readFileSync(KEY_INDEX_FILE,'utf8')||'{}'); return Number.isFinite(j.index)? j.index: 0; }}catch(e){} return 0; }
function writeIndex(i){ try{ fs.writeFileSync(KEY_INDEX_FILE, JSON.stringify({ index: i }), 'utf8'); }catch(e){} }
function readKeyState(){ try{ if(fs.existsSync(KEY_STATE_FILE)){ const j = JSON.parse(fs.readFileSync(KEY_STATE_FILE,'utf8')||'{}'); return j; }}catch(e){} return {}; }
function writeKeyState(obj){ try{ fs.writeFileSync(KEY_STATE_FILE, JSON.stringify(obj || {}, null, 2), 'utf8'); }catch(e){} }

async function tryGeminiWithKeys(url, body, keys){
  if(!keys || !keys.length) return null;
  const now = Date.now();
  const state = readKeyState();
  const cooldownMs = Number(process.env.GEMINI_KEY_COOLDOWN_MS || 10 * 60 * 1000);
  const active = [];
  for(let i=0;i<keys.length;i++){ const k = keys[i]; const s = state[k] || {}; if(s.disabledUntil && Number(s.disabledUntil) > now) continue; active.push({ idx:i, key:k }); }
  const tryList = (active.length? active : keys.map((k,i)=>({ idx:i, key:k })));
  let start = readIndex() || 0; const n = tryList.length; let lastErr = null;
  for(let attempt=0; attempt<n; attempt++){
    const entry = tryList[(start + attempt) % n]; const idx = entry.idx; const key = entry.key;
    const requestUrl = `${url}?key=${encodeURIComponent(key)}`;
    try{
      const resp = await fetchFn(requestUrl, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(body) });
      let data = null; try{ data = await resp.json(); }catch(e){ const raw = await resp.text().catch(()=>'<no body>'); lastErr = new Error('not_json:'+raw.substring(0,1000)); data = null; }
      if(!resp || resp.status >= 500){ lastErr = new Error('server_error'); continue; }
      if(resp.status === 401 || resp.status === 403){ lastErr = new Error('invalid_key'); state[key] = state[key] || {}; state[key].disabledUntil = Date.now() + (24*60*60*1000); writeKeyState(state); writeIndex((idx+1)%keys.length); continue; }
      if(resp.status === 429 || (data && data.error && /RATE_LIMIT|quota|QUOTA_EXCEEDED|RESOURCE_EXHAUSTED/i.test(JSON.stringify(data.error)))){ lastErr = new Error('quota_exceeded'); state[key] = state[key] || {}; state[key].disabledUntil = Date.now() + cooldownMs; writeKeyState(state); writeIndex((idx+1)%keys.length); continue; }
      if(resp.status >=200 && resp.status < 300 && data){ if(state[key]){ delete state[key].disabledUntil; writeKeyState(state); } writeIndex((idx+1)%keys.length); return { resp, data }; }
      lastErr = new Error('unexpected_response');
    }catch(e){ lastErr = e; }
  }
  if(lastErr) console.error('Gemini keys all failed lastErr=', lastErr && lastErr.message);
  return null;
}

// lightweight auth user extraction (mirrors search.js behavior)
const jwt = require('jsonwebtoken');
const COOKIE_NAME = 'mentora_token';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-please-change';
function getUserFromReq(req){ try{ const token = req.cookies && req.cookies[COOKIE_NAME] || (req.headers.authorization && req.headers.authorization.split(' ')[1]); if(!token) return '001'; const payload = jwt.verify(token, JWT_SECRET); return payload.user || '001'; }catch(e){ return '001'; } }

// POST /api/search2
router.post('/', async (req, res) => {
  try{
    const q = (req.body && req.body.query) ? String(req.body.query).trim() : '';
    if(!q) return res.status(400).json({ error: 'missing_query' });
    const user = getUserFromReq(req) || '001';

    const geminiModel = process.env.GEMINI_MODEL || 'text-bison-001';
    const urlBase = `https://generativelanguage.googleapis.com/v1beta2/models/${geminiModel}:generateText`;

    const prompt = `You are an educational assistant. Produce a JSON object (ONLY JSON) with keys:\n"explanation_short","key_points","examples","flashcards","diagram".\nExplanation should be 2-4 short sentences; key_points up to 6 short bullets; examples 1-3 short lines; flashcards up to 4 objects {front,back}. Respect the language of the query. Query: "${q}"`;
    const body = { prompt: { text: prompt }, temperature: 0.15, maxOutputTokens: 600 };

    const geminiKeys = loadGeminiKeys();
    let blocks = null;

    if(geminiKeys && geminiKeys.length && fetchFn){
      try{
        const attempt = await tryGeminiWithKeys(urlBase, body, geminiKeys);
        if(attempt && attempt.data){
          const data = attempt.data;
          const txt = (data && data.candidates && data.candidates[0] && data.candidates[0].output) || (data && data.output && data.output[0] && data.output[0].content) || (data && data.candidates && data.candidates[0] && data.candidates[0].content) || (data && data.result && JSON.stringify(data.result));
          if(txt){
            const s = String(txt);
            const m = s.match(/{[\s\S]*}/);
            if(m){ try{ blocks = JSON.parse(m[0]); }catch(e){ console.error('parse fail', e && e.message); } }
            if(!blocks) blocks = { explanation_short: s.substring(0,1200), key_points: [], examples: [], flashcards: [], diagram: '' };
          }
        }
      }catch(e){ console.error('gemini v2 failed', e && e.message); }
    }

    // Try OpenAI fallback
    const openaiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;
    const openaiModel = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    if(!blocks && openaiKey && fetchFn){
      try{
        const resOpen = await fetchFn('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${openaiKey}` },
          body: JSON.stringify({ model: openaiModel, messages:[{ role:'system', content:'You are a compact assistant that outputs JSON only.' }, { role:'user', content: prompt }], max_tokens:600, temperature:0.15 })
        });
        const j = await resOpen.json().catch(()=>null);
        const txt = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
        if(txt){ const m = txt.match(/{[\s\S]*}/); if(m){ try{ blocks = JSON.parse(m[0]); }catch(e){ console.error('openai parse fail', e && e.message); } } if(!blocks) blocks = { explanation_short: String(txt).substring(0,1200), key_points: [], examples: [], flashcards: [], diagram: '' }; }
      }catch(e){ console.error('openai fallback failed', e && e.message); }
    }

    // Final fallback generator
    if(!blocks){
      const short = `Краткое объяснение по "${q}": Основные идеи и применение.`;
      blocks = { explanation_short: short, key_points: [`Что такое ${q}`, 'Основная идея', 'Где применяется'], examples: [`Пример применения 1`, `Пример 2`], flashcards: [{ front: `Что такое ${q}?`, back: `Короткий ответ про ${q}` }], diagram: '' };
    }

    // Normalize outputs and produce flashcards if missing
    let flashcards = Array.isArray(blocks.flashcards) ? blocks.flashcards.slice(0,8) : [];
    if(!flashcards || !flashcards.length){
      const pts = Array.isArray(blocks.key_points) && blocks.key_points.length ? blocks.key_points : (String(blocks.explanation_short||'').split(/\.|\n/).map(s=>s.trim()).filter(s=>s.length>6));
      flashcards = pts.slice(0,4).map((p,i)=>({ front: p, back: (blocks.explanation_short||'').substring(0,400) }));
    }

    // Save generated flashcards and history
    try{ saveGeneratedFlashcards(user, flashcards); }catch(e){}
    try{ saveSearchForUser(user, q, blocks.explanation_short || ''); }catch(e){}

    return res.json({ ok:true, query: q, blocks, explanation: blocks.explanation_short, key_points: blocks.key_points || [], examples: blocks.examples || [], flashcards });
  }catch(e){ console.error('search_v2 error', e && e.message); return res.status(500).json({ error: 'server_error' }); }
});

module.exports = router;
