<<<<<<< HEAD
# MentoraAI (local demo)

This repository contains a minimal demo of MentoraAI: an Express backend (`Backend/`) serving a static frontend (`Frontent/`).

Quick setup (PowerShell)

1. Install dependencies in `Backend` and run locally:
```powershell
cd C:\Users\damir\Desktop\MentoraAI\Backend
npm install
npm start
```

2. Verify locally:
```powershell
curl http://localhost:3000/api/ping
```

Prepare for deploy to Render (step-by-step)

1. Create a GitHub repo (via website) named e.g. `mentora-ai`.
2. From project root, initialize git and push to GitHub:
```powershell
cd C:\Users\damir\Desktop\MentoraAI
git init
git add .
git commit -m "Initial commit — MentoraAI"
git branch -M main
git remote add origin https://github.com/<your-username>/mentora-ai.git
git push -u origin main
```
(Replace `<your-username>` with your GitHub account.)

3. On Render (https://dashboard.render.com):
 - Create a new **Web Service** and connect your GitHub repo.
 - Set **Root Directory** to `Backend` (because `server.js` lives there).
 - Build command: `npm install`
 - Start command: `npm start`
 - Add Environment Variables in Render dashboard (Settings -> Environment):
   - `JWT_SECRET` = a random string (e.g. `change-me-dev`)
   - (Optional) `GEMINI_API_KEYS`, `OPENAI_API_KEY` if you plan to use AI features

4. Deploy and open the Render-provided URL. Verify:
```powershell
curl https://<your-render-url>/api/ping
```

Notes
- Do NOT commit secret keys or `.env` files — use the Render dashboard to add secrets.
- The frontend folder is named `Frontent` (typo preserved) — server serves it as-is.

If you want, I can: create the GitHub repo for you via `gh` (if you install & login), or walk you through the web UI steps for Render.
=======
# MentoraAI
>>>>>>> 774d0c276f3844b9dd23ff6f564e218586751d93
