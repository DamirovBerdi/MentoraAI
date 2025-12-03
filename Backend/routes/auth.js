const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const usersUtil = require('../utils/users');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-please-change';
const COOKIE_NAME = 'mentora_token';
const TOKEN_EXPIRY = '3d';
const fs = require('fs');
const path = require('path');

// failed login tracking (simple file-backed store)
const ATTEMPTS_FILE = path.join(__dirname, '..', 'failed_logins.json');
const MAX_ATTEMPTS = 5; // attempts before temporary lock
const LOCK_MINUTES = 15; // lock duration

function readAttempts(){ try{ if(!fs.existsSync(ATTEMPTS_FILE)) return {}; return JSON.parse(fs.readFileSync(ATTEMPTS_FILE,'utf8')||'{}'); }catch(e){ return {}; } }
function writeAttempts(o){ try{ fs.writeFileSync(ATTEMPTS_FILE, JSON.stringify(o, null, 2), 'utf8'); }catch(e){} }
function getKeyFor(req, username){ // combine username and IP for throttling
  const ip = (req.ip || req.headers['x-forwarded-for'] || req.connection && req.connection.remoteAddress || 'unknown').split(',')[0].trim();
  const user = String(username||'').toLowerCase();
  return user + '|' + ip;
}
function isLocked(attempt){ if(!attempt) return false; if(attempt.lockUntil && Date.now() < attempt.lockUntil) return true; return false; }


// Helper: send token in HttpOnly cookie
function sendToken(res, username){
  const token = jwt.sign({ user: username }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
  const opts = { httpOnly: true, maxAge: 3*24*60*60*1000, path: '/', sameSite: 'lax' };
  // mark secure in production (requires HTTPS) — keep false for local dev
  if(process.env.NODE_ENV === 'production') opts.secure = true;
  res.cookie(COOKIE_NAME, token, opts);
}

router.post('/register', async (req, res) => {
  const { username, password } = req.body || {};
  if(!username || !password) return res.status(400).json({ error: 'missing_fields' });
  // Normalize and validate username
  const uname = String(username).trim();
  const usernameRegex = /^[a-zA-Z0-9_.-]{3,30}$/;
  if(!usernameRegex.test(uname)) return res.status(400).json({ error: 'invalid_username' });
  if(typeof password !== 'string' || password.length < 6) return res.status(400).json({ error: 'weak_password' });

  const users = usersUtil.readUsers();
  if(users[uname]) return res.status(409).json({ error: 'user_exists' });
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);
  users[uname] = { hash };
  try{
    usersUtil.writeUsers(users);
  }catch(e){
    return res.status(500).json({ error: 'write_failed' });
  }
  sendToken(res, uname);
  return res.json({ ok: true, user: uname });
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if(!username || !password) return res.status(400).json({ error: 'missing_fields' });
  const users = usersUtil.readUsers();
  const u = users[username];
  // check failed-attempts store
  try{
    const attempts = readAttempts();
    const key = getKeyFor(req, username);
    const record = attempts[key];
    if(isLocked(record)){
      const retryAfter = Math.ceil((record.lockUntil - Date.now())/1000);
      return res.status(429).json({ error: 'too_many_attempts', retry_after: retryAfter });
    }
  }catch(e){ /* ignore */ }
  if(!u){ try{ recordFailedAttempt(req, username); }catch(e){}; return res.status(404).json({ error: 'no_such_user' }); }
  const match = bcrypt.compareSync(password, u.hash);
  if(!match){ try{ recordFailedAttempt(req, username); }catch(e){}; return res.status(401).json({ error: 'wrong_password' }); }
  sendToken(res, username);
  // reset attempts on success
  try{
    const attempts = readAttempts();
    const key = getKeyFor(req, username);
    if(attempts[key]){ delete attempts[key]; writeAttempts(attempts); }
  }catch(e){}
  return res.json({ ok: true, user: username });
});

// increment failed attempt; called externally by other auth flows if needed
function recordFailedAttempt(req, username){
  try{
    const attempts = readAttempts();
    const key = getKeyFor(req, username);
    const rec = attempts[key] || { tries: 0 };
    rec.tries = (rec.tries||0) + 1;
    if(rec.tries >= MAX_ATTEMPTS){ rec.lockUntil = Date.now() + (LOCK_MINUTES * 60 * 1000); }
    attempts[key] = rec;
    writeAttempts(attempts);
    return rec;
  }catch(e){ return null; }
}

// export helper for other modules if they want to record failed attempts
try{ module.exports.recordFailedAttempt = recordFailedAttempt; }catch(e){}

// middleware to get current user from cookie
function requireAuth(req, res, next){
  try{
    const token = req.cookies[COOKIE_NAME] || (req.headers.authorization && req.headers.authorization.split(' ')[1]);
    if(!token) return res.status(401).json({ error: 'not_authenticated' });
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload.user;
    next();
  }catch(e){
    return res.status(401).json({ error: 'invalid_token' });
  }
}

router.get('/me', requireAuth, (req, res) => {
  res.json({ ok: true, user: req.user });
});

// logout: clear cookie
router.post('/logout', (req, res) => {
  try{
    res.clearCookie(COOKIE_NAME);
  }catch(e){}
  return res.json({ ok: true });
});

router.post('/change-password', requireAuth, async (req, res) => {
  const { oldPassword, newPassword } = req.body || {};
  if(!oldPassword || !newPassword) return res.status(400).json({ error: 'missing_fields' });
  const users = usersUtil.readUsers();
  const u = users[req.user];
  if(!u) return res.status(404).json({ error: 'no_such_user' });
  const match = bcrypt.compareSync(oldPassword, u.hash);
  if(!match) return res.status(401).json({ error: 'wrong_current_password' });
  if(oldPassword === newPassword) return res.status(400).json({ error: 'pw_same_as_old' });
  const salt = bcrypt.genSaltSync(10);
  u.hash = bcrypt.hashSync(newPassword, salt);
  users[req.user] = u;
  usersUtil.writeUsers(users);
  return res.json({ ok: true });
});

module.exports = router;
