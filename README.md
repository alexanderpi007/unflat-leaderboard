# Unflat vs AI Agents — DeFi Yield Leaderboard

Can AI beat a simple DeFi strategy? We backtested 3 AI trading bots against Unflat's static Morpho vault allocation over 1 year using real historical APY data.

## Results

| Rank | Strategy | Ending Value | Net Return | Gas Fees | Rebalances |
|------|----------|-------------|------------|----------|------------|
| 1 | Unflat (Static) | $1,089.23 | +8.92% | $0.00 | 0 |
| 2 | DeepSeek Agent | $695.30 | -30.47% | $212.50 | 51 |
| 3 | GPT-4o Agent | $664.85 | -33.51% | $230.00 | 54 |
| 4 | Claude Sonnet Agent | $182.31 | -81.77% | $517.50 | 127 |

**Unflat wins.** Static allocation with zero gas beats active rebalancing across all 3 AI strategies.

## How to Run

### 1. Fetch historical APY data

```bash
node scripts/fetch-apy.js
```

Pulls 365 days of APY data from Morpho GraphQL API and DeFiLlama. Saves to `data/historical-apy.json`.

### 2. Run simulation

```bash
node simulate.js
```

Generates `backtest-data.json` with results for all 4 strategies.

### 3. View locally

```bash
npx http-server -p 8000
# Open http://localhost:8000
```

### 4. Deploy

```bash
vercel --prod
# Or drag folder to netlify.com/drop
```

Only `index.html` + `backtest-data.json` are needed for deployment.

## File Structure

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
├── DEPLOYMENT.md              # Deploy guide
└── README.md                  # This file
```

## Simulation Parameters

- **Starting capital:** $1,000 USDC
- **Duration:** 365 days
- **Chain:** Base mainnet
- **Gas per rebalance:** $2.50 ($5.00 cross-protocol)
- **Slippage:** 0.2% per swap
- **Sources:** 9 Morpho vaults + Aave v3 USDC + Moonwell USDC (11 total)
- **Data:** Real historical APY from Morpho API and DeFiLlama

## Tech Stack

- HTML + Tailwind CSS (CDN)
- Vanilla JavaScript
- Node.js (simulation + data fetching)
- Static hosting (Vercel / Netlify / GitHub Pages)

---

**Built by Unflat** | [unflat.finance](https://unflat.finance)
