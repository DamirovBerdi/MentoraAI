const express = require('express');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const router = express.Router();
const FILE = path.join(__dirname, '..', 'games_db.json');
const COOKIE_NAME = 'mentora_token';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-please-change';

function readAll(){ try{ if(!fs.existsSync(FILE)) return {}; return JSON.parse(fs.readFileSync(FILE,'utf8')||'{}'); }catch(e){ return {}; } }
function writeAll(o){ try{ fs.writeFileSync(FILE, JSON.stringify(o, null, 2), 'utf8'); }catch(e){} }

function getUserFromReq(req){
  try{
    const token = req.cookies && (req.cookies[COOKIE_NAME] || (req.headers.authorization && req.headers.authorization.split(' ')[1]));
    if(!token) return '001';
    const payload = jwt.verify(token, JWT_SECRET);
    return payload.user || '001';
  }catch(e){ return '001'; }
}

// POST /api/games -> save game session { type, questions, answers, score }
router.post('/', (req, res)=>{
  try{
    const user = getUserFromReq(req);
    const body = req.body || {};
    const all = readAll();
    all[user] = all[user] || { sessions: [] };
    const id = Date.now().toString(36) + '-' + Math.floor(Math.random()*10000);
    const session = { id, type: body.type || 'unknown', questions: body.questions || [], answers: body.answers || [], score: body.score || 0, analysis: body.analysis || null, ts: Date.now() };
    all[user].sessions.unshift(session);
    if(all[user].sessions.length > 1000) all[user].sessions = all[user].sessions.slice(0,1000);
    writeAll(all);
    return res.json({ ok: true, session });
  }catch(e){ console.error('games save error', e && e.message); return res.status(500).json({ error: 'server_error' }); }
});

// GET /api/games -> list sessions
router.get('/', (req, res)=>{
  try{
    const user = getUserFromReq(req);
    const all = readAll();
    const sessions = (all[user] && Array.isArray(all[user].sessions)) ? all[user].sessions : [];
    return res.json({ ok: true, sessions });
  }catch(e){ console.error('games list error', e && e.message); return res.status(500).json({ error: 'server_error' }); }
});

// DELETE /api/games/:id -> remove a session by id
router.delete('/:id', (req, res)=>{
  try{
    const user = getUserFromReq(req);
    const id = req.params.id;
    const all = readAll();
    const sessions = (all[user] && Array.isArray(all[user].sessions)) ? all[user].sessions : [];
    const idx = sessions.findIndex(s => String(s.id) === String(id));
    if(idx === -1) return res.status(404).json({ error: 'not_found' });
    sessions.splice(idx,1);
    all[user].sessions = sessions;
    writeAll(all);
    return res.json({ ok: true });
  }catch(e){ console.error('games delete error', e && e.message); return res.status(500).json({ error: 'server_error' }); }
});

// PUT /api/games/:id -> update an existing session
router.put('/:id', (req, res)=>{
  try{
    const user = getUserFromReq(req);
    const id = req.params.id;
    const body = req.body || {};
    const all = readAll();
    const sessions = (all[user] && Array.isArray(all[user].sessions)) ? all[user].sessions : [];
    const idx = sessions.findIndex(s => String(s.id) === String(id));
    if(idx === -1) return res.status(404).json({ error: 'not_found' });
    const session = sessions[idx];
    // allow updating answers, score, analysis, ts
    session.answers = body.answers || session.answers || [];
    if(typeof body.score !== 'undefined') session.score = body.score;
    if(body.analysis) session.analysis = body.analysis;
    session.ts = Date.now();
    all[user].sessions[idx] = session;
    writeAll(all);
    return res.json({ ok: true, session });
  }catch(e){ console.error('games update error', e && e.message); return res.status(500).json({ error: 'server_error' }); }
});

module.exports = router;

// POST /api/games/:id/analyze -> run AI analysis on incorrect answers and save analysis
router.post('/:id/analyze', async (req, res) => {
  try{
    const user = getUserFromReq(req);
    const id = req.params.id;
    const all = readAll();
    const sessions = (all[user] && Array.isArray(all[user].sessions)) ? all[user].sessions : [];
    const idx = sessions.findIndex(s => String(s.id) === String(id));
    if(idx === -1) return res.status(404).json({ error: 'not_found' });
    const session = sessions[idx];
    // collect incorrect answers
    const incorrect = (session.answers||[]).map((a,i)=>({ index: i, q: (a && a.q) || (session.questions && session.questions[i] && session.questions[i].q), given: a && a.given, ok: !!a && !!a.ok })).filter(x=>!x.ok);
    if(incorrect.length === 0){ session.analysis = 'All answers look correct (no mistakes detected).'; all[user].sessions[idx] = session; writeAll(all); return res.json({ ok: true, analysis: session.analysis }); }

    // Build prompt for AI: include question, correct answer hint, user given answer, and ask for concise analysis and 1-3 improvement suggestions per mistake
    const lines = incorrect.map(it=>{
      const correctHint = (session.questions && session.questions[it.index] && session.questions[it.index].correct) || '';
      return `Q: ${it.q}\nGiven: ${it.given || ''}\nExpected/Hints: ${correctHint}`;
    }).join('\n\n');

    // Try to use the shared aiGenerate helper (from search route) if available
    let analysisText = null;
    try{
      const searchModule = require('./search');
      if(searchModule && typeof searchModule.aiGenerate === 'function'){
        const aiResp = await searchModule.aiGenerate(`Analyze mistakes and provide concise feedback and 1-3 study suggestions for each item:\n\n${lines}`);
        // aiResp may be structured; try to stringify useful fields
        if(typeof aiResp === 'string') analysisText = aiResp;
        else if(aiResp && (aiResp.analysis || aiResp.answer || aiResp.block1_main_ideas)){
          analysisText = String(aiResp.analysis || aiResp.answer || aiResp.block1_main_ideas);
        } else {
          analysisText = JSON.stringify(aiResp).slice(0,4000);
        }
      }
    }catch(e){ console.error('games analyze helper call failed', e && e.message); }

    if(!analysisText){
      // Fallback simple analysis text
      analysisText = 'Mistakes detected:\n' + incorrect.map(i=>`- ${i.q} — given: ${i.given || '<no answer>'}`).join('\n');
    }

    session.analysis = analysisText;
    session.ts = Date.now();
    all[user].sessions[idx] = session;
    writeAll(all);
    return res.json({ ok: true, analysis: session.analysis });
  }catch(e){ console.error('games analyze error', e && e.message); return res.status(500).json({ error: 'server_error' }); }
});
