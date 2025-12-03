// Load environment variables from Backend/.env for local development
try{ require('dotenv').config({ path: require('path').join(__dirname, '.env') }); }catch(e){ /* dotenv optional */ }
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth');
const usersUtil = require('./utils/users');
// Replace old search route with new resilient search API
const searchRoutes = require('./routes/search_api');
const flashcardsRoutes = require('./routes/flashcards');
const gamesRoutes = require('./routes/games');
const filesRoutes = require('./routes/files');
const bcrypt = require('bcryptjs');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(cookieParser());

// Simple request logger to help debug which routes are called and responses
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(`${new Date().toISOString()} ${req.ip} ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
  });
  next();
});

// Basic CORS for local development
app.use(function(req, res, next) {
  // Only echo the Origin header when present. Do NOT use '*' when credentials are allowed.
  const origin = req.headers.origin;
  if(origin) res.header("Access-Control-Allow-Origin", origin);
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/api/ping', (req, res) => res.json({ ok: true, now: Date.now() }));
app.use('/api/auth', authRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/activity', require('./routes/activity'));
app.use('/api/flashcards', flashcardsRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/files', filesRoutes);
// ensure games and flashcards files exist
try{ const fc = require('fs').openSync(require('path').join(__dirname,'..','flashcards_db.json'),'a'); require('fs').closeSync(fc); }catch(e){}
try{ const gg = require('fs').openSync(require('path').join(__dirname,'..','games_db.json'),'a'); require('fs').closeSync(gg); }catch(e){}

// Serve frontend static files from ../Frontent
const frontendPath = path.join(__dirname, '..', 'Frontent');
app.use(express.static(frontendPath));

// Small diagnostic endpoint to inspect network interfaces and process info
app.get('/api/debug-binding', (req, res) => {
  try{
    const os = require('os');
    const nifs = os.networkInterfaces();
    return res.json({ ok: true, pid: process.pid, interfaces: nifs });
  }catch(e){ return res.json({ ok: false, error: String(e && e.message) }); }
});

// For any other GET request not handled by API, return the frontend index.html
app.get('*', (req, res, next) => {
  // skip API routes
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Bind explicitly to 0.0.0.0 to ensure IPv4 localhost binds correctly on Windows
app.listen(PORT, '0.0.0.0', () => {
  // Report basic environment diagnostics (don't print keys themselves)
  try{
    const geminiList = (process.env.GEMINI_API_KEYS && String(process.env.GEMINI_API_KEYS).trim()) ? String(process.env.GEMINI_API_KEYS).split(',').map(s=>s.trim()).filter(Boolean) : [];
    const geminiIndividual = Object.keys(process.env).filter(k=>/^GEMINI_API_KEY_\d+$/.test(k)).map(k=>process.env[k]).filter(Boolean);
    const geminiCount = geminiList.length || geminiIndividual.length;
    const openai = !!(process.env.OPENAI_API_KEY || process.env.OPENAI_KEY);
    const os = require('os');
    const nifs = os.networkInterfaces();
    console.log(`Mentora backend listening on http://localhost:${PORT} (bound 0.0.0.0)`);
    console.log(`Process pid=${process.pid}`);
    console.log('Network interfaces:', Object.keys(nifs).map(k=>({ iface:k, addrs:nifs[k].map(a=>({ address: a.address, family: a.family, internal: a.internal })) })));
    console.log(`Detected GEMINI keys: ${geminiCount} (via GEMINI_API_KEYS or GEMINI_API_KEY_*)`);
    console.log(`OpenAI key present: ${openai}`);
  }catch(e){ console.log(`Mentora backend listening on http://localhost:${PORT}`); }
});
