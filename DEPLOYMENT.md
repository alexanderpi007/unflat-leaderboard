# Deployment Guide — Unflat vs AI Agents Leaderboard

## What You Have

```
unflat-leaderboard/
├── index.html                 # Leaderboard page (standalone, no build step)
├── backtest-data.json         # Pre-calculated simulation results
├── simulate.js                # Backtest simulator (Node.js)
├── scripts/
│   └── fetch-apy.js           # Fetches historical APY from Morpho + DeFiLlama
├── data/
│   └── historical-apy.json    # 365 days of APY data (11 sources)
├── LEADERBOARD_SPEC.md        # Technical specification
├── DEPLOYMENT.md              # This file
└── README.md                  # Project overview
```

**For deployment, only `index.html` + `backtest-data.json` are needed.**

---

## Quick Deploy (3 Options)

### Option 1: Vercel (Recommended)

```bash
npm install -g vercel
cd unflat-leaderboard
vercel --prod
```

Result: Live URL in ~30 seconds (e.g., `unflat-leaderboard.vercel.app`)

Custom domain:
```bash
vercel --prod --alias leaderboard.unflat.finance
```

---

### Option 2: Netlify

**Drag & Drop:**
1. Go to [netlify.com/drop](https://app.netlify.com/drop)
2. Drag the `unflat-leaderboard` folder
3. Done! Live URL instantly.

**Or via GitHub:**
1. Push folder to GitHub repo
2. Connect repo in Netlify dashboard
3. Auto-deploy on every push

---

### Option 3: GitHub Pages (Free)

```bash
cd unflat-leaderboard
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/unflat-leaderboard.git
git push -u origin main
```

Enable GitHub Pages: repo Settings → Pages → Source: `main` branch, `/ (root)`.

Result: Live at `YOUR_USERNAME.github.io/unflat-leaderboard`

---

## Re-running the Simulation

### Step 1: Fetch fresh APY data

```bash
node scripts/fetch-apy.js
```

Pulls 365 days of real historical APY from Morpho GraphQL API and DeFiLlama. Saves to `data/historical-apy.json`.

### Step 2: Run simulation

```bash
node simulate.js
```

Generates `backtest-data.json` with results for all 4 strategies.

### Simulation Parameters

```javascript
const CONFIG = {
  startingCapital: 1000,       // $1,000 USDC
  durationDays: 365,           // 1 year
  gasPerRebalance: 2.50,       // $2.50 per rebalance ($5.00 cross-protocol)
  slippagePerSwap: 0.002,      // 0.2% per swap
};
```

---

## Customizing the Page

### Change Colors

Edit `index.html` Tailwind config:
```javascript
tailwind.config = {
  theme: {
    extend: {
      colors: {
        'accent': '#6366f1',  // Change to your brand color
      }
    }
  }
}
```

### Add Logo

Replace the placeholder "U" logo in the header:
```html
<img src="assets/logo.svg" alt="Unflat" class="w-8 h-8">
```

---

## Testing Locally

```bash
# Option A: Python
python -m http.server 8000

# Option B: Node.js
npx http-server -p 8000
```

Open `http://localhost:8000` and check:
- Table loads with data
- Numbers formatted correctly (dollar signs, thousand separators)
- Colors applied (green for positive, red for negative returns)
- Responsive on mobile
- No console errors (F12 → Console)

---

## Pre-Launch Checklist

- [ ] Fetch latest APY data: `node scripts/fetch-apy.js`
- [ ] Run simulation: `node simulate.js`
- [ ] Test locally: open in browser
- [ ] Check table renders correctly
- [ ] Verify CTA button links to correct URL
- [ ] Test on mobile (responsive)
- [ ] Add custom domain (if using Vercel/Netlify)
- [ ] Deploy

---

## Troubleshooting

**Table is empty:** Open browser console (F12) → Check for errors. Likely `backtest-data.json` not found.

**Data looks wrong:** Re-fetch APY data and re-run simulation.

**Page not updating:** Hard refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows).

**Deploy failed on Vercel:** Ensure `index.html` is in root folder (not nested).

---

**Questions?** Check `LEADERBOARD_SPEC.md` for full technical details.
