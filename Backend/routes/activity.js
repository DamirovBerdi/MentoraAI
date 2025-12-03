const express = require('express');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const router = express.Router();
const COOKIE_NAME = 'mentora_token';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-please-change';
const ACT_FILE = path.join(__dirname, '..', 'activity_db.json');

function readAct(){
  try{ if(!fs.existsSync(ACT_FILE)) return {}; return JSON.parse(fs.readFileSync(ACT_FILE,'utf8')||'{}'); }catch(e){ return {}; }
}
function writeAct(o){ try{ fs.writeFileSync(ACT_FILE, JSON.stringify(o, null, 2), 'utf8'); }catch(e){} }

function requireAuth(req, res, next){
  try{
    const token = req.cookies[COOKIE_NAME] || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    if(!token) return res.status(401).json({ error: 'not_authenticated' });
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload.user;
    next();
  }catch(e){ return res.status(401).json({ error: 'invalid_token' }); }
}

// heartbeat: { status: 'playing'|'browsing'|'idle' }
router.post('/heartbeat', requireAuth, (req, res) => {
  const st = (req.body && req.body.status) || 'idle';
  const act = readAct();
  // preserve existing user object if present
  act[req.user] = act[req.user] || {};
  act[req.user].lastSeen = Date.now();
  act[req.user].status = st;
  writeAct(act);
  return res.json({ ok: true });
});

// record a search query: POST { query: string }
router.post('/search', requireAuth, (req, res) => {
  try{
    const q = (req.body && req.body.query) ? String(req.body.query).trim() : '';
    if(!q) return res.status(400).json({ error: 'missing_query' });
    const act = readAct();
    act[req.user] = act[req.user] || {};
    act[req.user].history = act[req.user].history || [];
    act[req.user].history.unshift({ query: q, ts: Date.now() });
    // cap history length
    if(act[req.user].history.length > 100) act[req.user].history = act[req.user].history.slice(0,100);
    writeAct(act);
    return res.json({ ok: true });
  }catch(e){ return res.status(500).json({ error: 'server_error' }); }
});

// get user's search history
router.get('/search', requireAuth, (req, res) => {
  const act = readAct();
  const user = act[req.user] || {};
  const history = user.history || [];
  return res.json({ ok: true, history });
});

// clear user's search history
router.delete('/search', requireAuth, (req, res) => {
  const act = readAct();
  act[req.user] = act[req.user] || {};
  act[req.user].history = [];
  writeAct(act);
  return res.json({ ok: true });
});

// admin can read raw activity map
router.get('/map', requireAuth, (req, res) => {
  // basic admin check handled by caller if needed
  const act = readAct();
  res.json({ ok: true, map: act });
});

module.exports = router;
