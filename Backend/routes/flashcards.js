const express = require('express');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const router = express.Router();
const FILE = path.join(__dirname, '..', 'flashcards_db.json');
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

// GET /api/flashcards -> list user's flashcards
router.get('/', (req, res)=>{
  try{
    const user = getUserFromReq(req);
    const all = readAll();
    const list = (all[user] && Array.isArray(all[user].cards)) ? all[user].cards : [];
    return res.json({ ok: true, cards: list });
  }catch(e){ console.error('flashcards list error', e && e.message); return res.status(500).json({ error: 'server_error' }); }
});

// POST /api/flashcards -> { front, back }
router.post('/', (req, res)=>{
  try{
    const user = getUserFromReq(req);
    const front = req.body && req.body.front ? String(req.body.front) : '';
    const back = req.body && req.body.back ? String(req.body.back) : '';
    if(!front) return res.status(400).json({ error: 'missing_front' });
    const all = readAll();
    all[user] = all[user] || { cards: [] };
    const id = Date.now().toString(36) + '-' + Math.floor(Math.random()*10000);
    const card = { id, front, back, ts: Date.now() };
    all[user].cards.unshift(card);
    if(all[user].cards.length > 1000) all[user].cards = all[user].cards.slice(0,1000);
    writeAll(all);
    return res.json({ ok: true, card });
  }catch(e){ console.error('flashcards save error', e && e.message); return res.status(500).json({ error: 'server_error' }); }
});

// DELETE /api/flashcards/:id -> delete card
router.delete('/:id', (req, res)=>{
  try{
    const user = getUserFromReq(req);
    const id = String(req.params.id || '');
    if(!id) return res.status(400).json({ error: 'missing_id' });
    const all = readAll();
    all[user] = all[user] || { cards: [] };
    const before = all[user].cards.length;
    all[user].cards = all[user].cards.filter(c=>c.id !== id);
    if(all[user].cards.length !== before) writeAll(all);
    return res.json({ ok: true });
  }catch(e){ console.error('flashcards delete error', e && e.message); return res.status(500).json({ error: 'server_error' }); }
});

module.exports = router;
