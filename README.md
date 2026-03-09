# Laser Level — GitHub + Vercel Deploy

## One-time setup (~5 minutes)

### 1. Push to GitHub
Create a new repo on github.com (call it `laser-level` or whatever you want), then:

```bash
cd laser-level-vercel
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### 2. Connect to Vercel
1. Go to vercel.com → New Project
2. Import your GitHub repo
3. Vercel auto-detects Vite — just click **Deploy**
4. Done. You get a URL like `https://laser-level-abc123.vercel.app`

### 3. Add to iPhone Home Screen
1. Open Safari on iPhone → go to your Vercel URL
2. Tap Share → **Add to Home Screen** → Add
3. Opens full-screen like a native app

---

## Updating the app
Just push to GitHub — Vercel redeploys automatically:

```bash
git add .
git commit -m "Update"
git push
```

---

## Features
- **Auto-saves** all field data to phone storage as you type
- **Works offline** after first load — no signal needed in the field
- **NEW JOB** button on setup screen clears data between jobs
- Export to CSV (offline) or Google Drive (needs signal)
