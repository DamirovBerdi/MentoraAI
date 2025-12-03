const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const ACT_FILE = path.join(__dirname, '..', 'activity_db.json');

function readAct(){ try{ if(!fs.existsSync(ACT_FILE)) return {}; return JSON.parse(fs.readFileSync(ACT_FILE,'utf8')||'{}'); }catch(e){ return {}; } }
function writeAct(o){ try{ fs.writeFileSync(ACT_FILE, JSON.stringify(o, null, 2), 'utf8'); }catch(e){} }

// Utility to save search to activity history (same format as activity route)
function saveSearchForUser(user, query, answer){
  try{
    const act = readAct();
    act[user] = act[user] || {};
    act[user].history = act[user].history || [];
    act[user].history.unshift({ query: query, answer: answer || '', ts: Date.now() });
    if(act[user].history.length > 100) act[user].history = act[user].history.slice(0,100);
    writeAct(act);
  }catch(e){}
}

// Save generated flashcards into flashcards_db.json under the user key
function saveGeneratedFlashcards(user, cards){
  try{
    const fcFile = path.join(__dirname, '..', 'flashcards_db.json');
    let all = {};
    try{ if(fs.existsSync(fcFile)) all = JSON.parse(fs.readFileSync(fcFile,'utf8')||'{}'); }catch(e){ all = {}; }
    all[user] = all[user] || { cards: [] };
    // prepend generated cards (but keep id and ts)
    const now = Date.now();
    const gen = (cards||[]).map((c,i)=>({ id: (now+i).toString(36)+'-'+Math.floor(Math.random()*10000), front: c.front, back: c.back, ts: now }));
    all[user].cards = gen.concat(all[user].cards || []);
    if(all[user].cards.length > 1000) all[user].cards = all[user].cards.slice(0,1000);
    fs.writeFileSync(fcFile, JSON.stringify(all, null, 2), 'utf8');
  }catch(e){ console.error('saveGeneratedFlashcards failed', e && e.message); }
}

// Try to use global fetch or node-fetch fallback
let fetchFn = (global && global.fetch) ? global.fetch : null;
try{ if(!fetchFn) fetchFn = require('node-fetch'); }catch(e){}
const { execFile } = require('child_process');
const PY_AI_CLI = path.join(__dirname, '..', 'GeminiApi', 'ai_cli.py');

async function aiGenerate(query, languageHint){
  // If requested (env USE_PY_AI=1) and ai_cli.py exists, run the Python helper
  try{
    if((process.env.USE_PY_AI === '1' || process.env.USE_PY_AI === 'true') && fs.existsSync(PY_AI_CLI)){
      // call python script with query
      const py = process.env.PYTHON_BIN || 'python';
      try{
        const out = await new Promise((resolve, reject)=>{
          const child = execFile(py, [PY_AI_CLI, '--query', query], { timeout: 20000 }, (err, stdout, stderr) => {
            if(err) return reject(err);
            return resolve(stdout);
          });
        });
        try{
          const obj = JSON.parse(String(out));
          // if object contains an error, throw to fallback
          if(obj && obj.error) throw new Error(obj.error + (obj.detail?(': '+obj.detail):''));
          return obj;
        }catch(e){ console.error('Python AI CLI returned invalid JSON or error:', e && e.message); }
      }catch(e){ console.error('Python AI CLI failed:', e && e.message); }
    }
  }catch(e){ console.error('aiGenerate py check failed', e && e.message); }

  // Prefer Google Gemini (Generative Language) if available.
  // Support multiple keys and automatic failover. Provide keys as a comma-separated
  // env var `GEMINI_API_KEYS` or as individual variables `GEMINI_API_KEY_1`, etc.
  const geminiModel = process.env.GEMINI_MODEL || 'text-bison-001';
  const KEY_INDEX_FILE = path.join(__dirname, '..', 'gemini_key_index.json');
  const KEY_STATE_FILE = path.join(__dirname, '..', 'gemini_key_state.json');

  function loadGeminiKeys(){
    // Load Gemini API keys from environment.
    // Priority:
    // 1) GEMINI_API_KEYS (comma-separated list)
    // 2) individual GEMINI_API_KEY_1..N variables
    // 3) GOOGLE_API_KEYS / GOOGLE_API_KEY as legacy fallbacks
    const envList = process.env.GEMINI_API_KEYS || process.env.GOOGLE_API_KEYS || process.env.GOOGLE_API_KEY;
    if (envList && String(envList).trim()) {
      return String(envList).split(',').map(s=>s.trim()).filter(Boolean);
    }

    // Collect individual GEMINI_API_KEY_1..N variables
    const keys = [];
    Object.keys(process.env).forEach(k => {
      const m = k.match(/^GEMINI_API_KEY_(\d+)$/);
      if (m) {
        const idx = Number(m[1]);
        if (!Number.isNaN(idx)) keys.push({ idx, key: process.env[k] });
      }
    });
    if (keys.length) {
      keys.sort((a,b)=>a.idx-b.idx);
      return keys.map(x=>String(x.key).trim()).filter(Boolean);
    }

    // No keys found in environment — return empty list so caller can fallback if needed
    return [];
  }

  function readIndex(){
    try{ if(fs.existsSync(KEY_INDEX_FILE)){
        const j = JSON.parse(fs.readFileSync(KEY_INDEX_FILE,'utf8')||'{}');
        return Number.isFinite(j.index)? j.index: 0;
      }}catch(e){}
    return 0;
  }

  function writeIndex(i){
    try{ fs.writeFileSync(KEY_INDEX_FILE, JSON.stringify({ index: i }), 'utf8'); }catch(e){}
  }

  function readKeyState(){
    try{ if(fs.existsSync(KEY_STATE_FILE)){
        const j = JSON.parse(fs.readFileSync(KEY_STATE_FILE,'utf8')||'{}');
        return j;
      }}catch(e){}
    return {};
  }

  function writeKeyState(obj){
    try{ fs.writeFileSync(KEY_STATE_FILE, JSON.stringify(obj || {}, null, 2), 'utf8'); }catch(e){}
  }

  async function tryGeminiWithKeys(url, body, keys){
    if(!keys || !keys.length) return null;
    const now = Date.now();
    const state = readKeyState();
    const cooldownMs = Number(process.env.GEMINI_KEY_COOLDOWN_MS || 10 * 60 * 1000); // default 10 minutes

    // Build active keys list, skipping temporarily disabled keys
    const activeKeys = [];
    for(let i=0;i<keys.length;i++){
      const k = keys[i];
      const s = state[k] || {};
      if(s.disabledUntil && Number(s.disabledUntil) > now){
        // skip disabled key
        continue;
      }
      activeKeys.push({ idx: i, key: k });
    }

    // If no active keys (all disabled), fall back to attempting with all keys (to get latest errors)
    const tryList = (activeKeys.length ? activeKeys : keys.map((k,i)=>({ idx:i, key:k })));

    let start = readIndex() || 0;
    const n = tryList.length;
    let lastErr = null;
    for(let attempt=0; attempt<n; attempt++){
      const entry = tryList[(start + attempt) % n];
      const idx = entry.idx;
      const key = entry.key;
      const requestUrl = (typeof key === 'string' && key.match(/^https?:\/\//i)) ? key : `${url}?key=${encodeURIComponent(key)}`;
      try{
        const resp = await fetchFn(requestUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        let data = null;
        try{ data = await resp.json(); }catch(e){ const raw = await resp.text().catch(()=>'<no body>'); lastErr = new Error('not_json:'+raw.substring(0,1000)); data = null; }
        if(!resp || resp.status >= 500){ lastErr = new Error('server_error'); continue; }
        // invalid key
        if(resp.status === 401 || resp.status === 403 || (data && data.error && data.error.message && /API key not valid|invalid/i.test(String(data.error.message)))){
          lastErr = new Error('invalid_key');
          // mark this key as disabled for 24h
          state[key] = state[key] || {};
          state[key].disabledUntil = Date.now() + (24*60*60*1000);
          writeKeyState(state);
          // advance stored index so next time start moves past this
          writeIndex((idx+1)%keys.length);
          continue;
        }
        // quota or rate-limited
        if(resp.status === 429 || (data && data.error && /RATE_LIMIT|quota|QUOTA_EXCEEDED|RESOURCE_EXHAUSTED/i.test(JSON.stringify(data.error)))){
          lastErr = new Error('quota_exceeded');
          // temporarily disable this key for cooldownMs
          state[key] = state[key] || {};
          state[key].disabledUntil = Date.now() + cooldownMs;
          writeKeyState(state);
          // advance stored index so next time we don't immediately retry this key
          writeIndex((idx+1)%keys.length);
          continue;
        }
        // success path
        if(resp.status >=200 && resp.status < 300 && data){
          // clear disabled state for this key
          if(state[key]){ delete state[key].disabledUntil; writeKeyState(state); }
          writeIndex((idx+1)%keys.length);
          return { resp, data };
        }
        lastErr = new Error('unexpected_response');
      }catch(e){ lastErr = e; }
    }
    if(lastErr) console.error('Gemini keys all failed lastErr=', lastErr && lastErr.message);
    return null;
  }
  const openaiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;
  const openaiModel = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
  const prompt = `You are an educational assistant. Produce a JSON object with keys: block1_main_ideas, block2_formulas, block3_examples, block4_diagram.\nThe content should be concise and organized. Respect the language of the user's query. Query: "${query}"`;

  // Try Gemini REST directly (no python helper). Include simple retry/diagnostics.
  // Build list of keys and attempt with rotation/failover
  const geminiKeys = loadGeminiKeys();
  if(geminiKeys && geminiKeys.length && fetchFn){
    try{
      const urlBase = `https://generativelanguage.googleapis.com/v1beta2/models/${geminiModel}:generateText`;
      const body = { prompt: { text: prompt }, temperature: 0.2, maxOutputTokens: 800 };
      // try calling with rotation over keys
      const attemptResult = await tryGeminiWithKeys(urlBase, body, geminiKeys.map(k=>`${urlBase}?key=${encodeURIComponent(k)}`));
      // attemptResult is null if all keys failed
      if(attemptResult && attemptResult.data){
        const data = attemptResult.data;
        const txt = (data && data.candidates && data.candidates[0] && data.candidates[0].output) || (data && data.output && data.output[0] && data.output[0].content) || (data && data.candidates && data.candidates[0] && data.candidates[0].content);
        if(txt){
          const s = String(txt);
          const m = s.match(/{[\s\S]*}/);
          if(m){ try{ return JSON.parse(m[0]); }catch(e){ console.error('Failed to parse JSON from Gemini reply', e && e.message); } }
          return { block1_main_ideas: s, block2_formulas: '', block3_examples: '', block4_diagram: '' };
        }
      }
    }catch(e){ console.error('Gemini call failed', e && e.message); }
  }

  // If Gemini not available, try OpenAI if configured
  if(openaiKey && fetchFn){
    try{
      const res = await fetchFn('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: openaiModel,
          messages: [{ role: 'system', content: 'You are a helpful assistant that outputs compact JSON.' }, { role: 'user', content: prompt }],
          max_tokens: 800,
          temperature: 0.2
        })
      });
      let data = null;
      try{ data = await res.json(); }catch(e){
        const raw = await res.text().catch(()=>'<no body>');
        console.error('OpenAI HTTP response not JSON, status=', res.status, 'body=', raw.substring(0,2000));
        throw e;
      }
      if(res.status < 200 || res.status >= 300){
        console.error('OpenAI HTTP error status=', res.status, 'body=', JSON.stringify(data).substring(0,2000));
      }
      const txt = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
      if(txt){
        const m = txt.match(/{[\s\S]*}/);
        if(m){ try{ const j = JSON.parse(m[0]); return j; }catch(e){ console.error('Failed to parse JSON from OpenAI reply:', m[0].substring(0,2000)); } }
        return { block1_main_ideas: txt, block2_formulas: '', block3_examples: '', block4_diagram: '' };
      }
      console.error('OpenAI returned no text in response', JSON.stringify(data).substring(0,2000));
    }catch(e){ console.error('OpenAI call failed', e && e.message); }
  }

  // Fallback mock generator
  return {
    block1_main_ideas: `Blok 1: main ideas for \"${query}\"\n- Core concept A\n- Core concept B\n- Core concept C`,
    block2_formulas: `Blok 2: formula\nFormula: example = a * b + c`,
    block3_examples: `Blok 3: examples\n1) Example one applying ${query}\n2) Example two`,
    block4_diagram: `Blok 4: Diagramma/infografika\n[Diagram or ASCII art placeholder]`
  };
}

// middleware to read token/cookie-based auth similar to auth route
const jwt = require('jsonwebtoken');
const COOKIE_NAME = 'mentora_token';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-please-change';
function getUserFromReq(req){
  try{
    const token = req.cookies[COOKIE_NAME] || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    if(!token) return '001';
    const payload = jwt.verify(token, JWT_SECRET);
    return payload.user || '001';
  }catch(e){ return '001'; }
}

// POST /api/search -> { query }
router.post('/', async (req, res) => {
  try{
    const q = (req.body && req.body.query) ? String(req.body.query).trim() : '';
    if(!q) return res.status(400).json({ error: 'missing_query' });
    // determine user (use token if present, otherwise fallback to static id '001')
    const user = getUserFromReq(req) || '001';
    // generate AI response
    const blocks = await aiGenerate(q);

    // Normalize blocks into ordered sections expected by UI
    const mainThings = blocks.block1_main_ideas || blocks.block1 || blocks.mainThings || '';
    const info = blocks.block2_formulas || blocks.block2 || blocks.info || '';
    const images = blocks.images || blocks.photos || [];
    const examples = blocks.block3_examples || blocks.block3 || blocks.examples || '';
    const summary = blocks.block4_diagram || blocks.block4 || blocks.summary || '';

    // Extract answer and keyPoints
    let answer = '';
    if(blocks.answer) answer = String(blocks.answer);
    else answer = String(mainThings || info || summary || '');

    let keyPoints = [];
    if(Array.isArray(blocks.keyPoints)) keyPoints = blocks.keyPoints;
    else if(mainThings){
      const s = String(mainThings);
      keyPoints = s.split(/\r?\n/).map(l=>l.replace(/^\s*[-•\d\.\)\s]*/,'').trim()).filter(l=>l.length>3).slice(0,10);
    }

    // Generate 10 flashcards if model didn't provide them
    let generatedFlashcards = [];
    if(Array.isArray(blocks.flashcards) && blocks.flashcards.length){
      generatedFlashcards = blocks.flashcards.slice(0,10).map(f=>({ front: f.front || '', back: f.back || '' }));
    } else {
      // Build flashcards heuristically from keyPoints and answer
      const pts = keyPoints.length ? keyPoints : (answer.split(/\.|\n/).map(s=>s.trim()).filter(s=>s.length>8));
      for(let i=0;i<10;i++){
        const front = pts[i] || (`Key idea ${i+1} about ${q}`);
        const back = (answer || '') + (pts[i] ? ('\n\nNote: '+pts[i]) : '');
        generatedFlashcards.push({ front, back });
      }
    }

    // Save generated flashcards for the user (so they appear in flashcards menu)
    try{ saveGeneratedFlashcards(user, generatedFlashcards); }catch(e){ console.error('saveGeneratedFlashcards error', e && e.message); }

    // Save history with answer (concise)
    try{ saveSearchForUser(user, q, answer); }catch(e){}

  // include raw blocks as `blocks` for the frontend renderer
  return res.json({ ok: true, query: q, blocks: blocks || {}, mainThings, info, images, examples, summary, answer, keyPoints, flashcards: generatedFlashcards });
  }catch(e){
    console.error('search error', e && e.message);
    return res.status(500).json({ error: 'server_error' });
  }
});

// Debug endpoint: runs quick Gemini/OpenAI checks and returns diagnostics
router.get('/debug', async (req, res) => {
  const sample = (req.query && req.query.q) ? String(req.query.q) : 'diagnostic test';
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL || 'text-bison-001';
  const openaiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;
  const openaiModel = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
  const prompt = `Diagnostic request for: ${sample}`;
  const diagnostics = { geminiKey: !!geminiKey, openaiKey: !!openaiKey, gemini: null, openai: null, aiGenerate: null };

  // Gemini REST check
  if(geminiKey && fetchFn){
    try{
      const url = `https://generativelanguage.googleapis.com/v1beta2/models/${geminiModel}:generateText?key=${geminiKey}`;
      const body = { prompt: { text: prompt }, temperature: 0.2, maxOutputTokens: 200 };
      const resp = await fetchFn(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const status = resp.status;
      let text = null;
      try{ text = await resp.text(); }catch(e){ text = '<no body>'; }
      diagnostics.gemini = { status, body: (text||'').slice(0,4000) };
    }catch(e){ diagnostics.gemini = { error: String(e && e.message) }; }
  }

  // OpenAI REST check
  if(openaiKey && fetchFn){
    try{
      const url = 'https://api.openai.com/v1/chat/completions';
      const body = JSON.stringify({ model: openaiModel, messages: [{ role: 'user', content: prompt }], max_tokens: 200 });
      const resp = await fetchFn(url, { method: 'POST', headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${openaiKey}` }, body });
      const status = resp.status;
      let text = null;
      try{ text = await resp.text(); }catch(e){ text = '<no body>'; }
      diagnostics.openai = { status, body: (text||'').slice(0,4000) };
    }catch(e){ diagnostics.openai = { error: String(e && e.message) }; }
  }

  // Run aiGenerate to see final behavior
  try{
    const blocks = await aiGenerate(sample);
    diagnostics.aiGenerate = blocks;
  }catch(e){ diagnostics.aiGenerate = { error: String(e && e.message) }; }

  // Add gemini key rotation/state diagnostics
  try{
    const keys = (typeof loadGeminiKeys === 'function') ? loadGeminiKeys() : [];
    diagnostics.geminiKeysCount = keys.length;
    diagnostics.currentIndex = readIndex();
    diagnostics.keyState = readKeyState();
  }catch(e){ /* ignore */ }

  return res.json({ ok: true, diagnostics });
});

module.exports = router;
// also expose aiGenerate for other routes (games analysis, etc.)
try{ module.exports.aiGenerate = aiGenerate; }catch(e){ /* best-effort export */ }
