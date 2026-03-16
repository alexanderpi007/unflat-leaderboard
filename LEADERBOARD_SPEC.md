# Unflat vs AI Agents Leaderboard — Technical Specification

**Version:** 2.0 — Updated after implementation
**Created:** 2026-03-16
**Deliverable:** Standalone HTML page + backtest simulation using real historical APY data

---

## Project Overview

**Concept:** "Can AI beat a simple strategy?"

Compare Unflat's static 3-vault allocation vs 3 AI agents that rebalance daily across 11 yield sources (9 Morpho vaults + Aave v3 + Moonwell) on Base.

**Thesis:**
- Unflat: Set & forget, zero gas, consistent compounding
- AI Bots: Daily analysis, frequent rebalancing → higher gross potential but eaten by fees + slippage

**Result:** Unflat wins on net returns. Static allocation with zero gas beats active rebalancing across all 3 AI strategies.

---

## Simulation Parameters

### Starting Conditions
- **Initial Capital:** $1,000 USDC
- **Duration:** 365 days (1 year)
- **Chain:** Base mainnet
- **Yield Sources:** 9 Morpho vaults + Aave v3 USDC + Moonwell USDC (11 total)
- **Gas Cost per Rebalance:** $2.50 (same protocol), $5.00 (cross-protocol)
- **Slippage:** 0.2% per swap
- **Capital Safety Threshold:** $100 (bots stop rebalancing below this)

### APY Data
- **Source:** Real historical data from Morpho GraphQL API and DeFiLlama
- **Period:** 365 days
- **Morpho:** Weekly snapshots interpolated to daily
- **Aave/Moonwell:** Daily snapshots from DeFiLlama yields API

### Strategies Tested

| Strategy | Description | Rebalance Logic |
|----------|-------------|-----------------|
| **Unflat (Static)** | 45% Steakhouse HY, 35% Moonwell Flagship, 20% Steakhouse USDC | Never (0 rebalances) |
| **GPT-4o Agent** | Conservative: rebalances when APY gap > 0.5% | Daily check, moderate frequency |
| **Claude Sonnet Agent** | Aggressive: always reallocates to top 3 highest APY | Daily check, high frequency |
| **DeepSeek Agent** | Balanced: weighted score (50% APY, 30% TVL, 20% safety), rebalances when delta > 0.3 | Daily check, moderate frequency |

### Cross-Protocol Gas Model

Bots rebalance across all 11 sources. When moving funds between different protocol families (e.g., Morpho → Aave), gas cost doubles:

- Same protocol (Morpho → Morpho): $2.50
- Cross-protocol (Morpho → Aave/Moonwell): $5.00

---

## Yield Sources

### Morpho Vaults (9)

| Vault | Address |
|-------|---------|
| Steakhouse USDC | `0xbeeF010f9cb27031ad51e3333f9aF9C6B1228183` |
| Re7 USDC | `0x12AFDeFb2237a5963e7BAb3e2D46ad0eee70406e` |
| Steakhouse Prime | `0xBEEFE94c8aD530842bfE7d8B397938fFc1cb83b2` |
| Steakhouse HY | `0xBEEFA7B88064FeEF0cEe02AAeBBd95D30df3878F` |
| Moonwell Flagship | `0xc1256Ae5FF1cf2719D4937adb3bbCCab2E00A2Ca` |
| Gauntlet Frontier | `0x236919F11ff9eA9550A4287696C2FC9e18E6e890` |
| Clearstar Reactor | `0x1D3b1Cd0a0f242d598834b3F2d126dC6bd774657` |
| ExtraFi XLend | `0x23479229e52Ab6aaD312D0B03DF9F33B46753B5e` |
| Gauntlet Prime | `0xeE8F4eC5672F09119b96Ab6fB59C27E1b7e44b61` |

### Comparison Protocols (2)

| Protocol | DeFiLlama Pool ID |
|----------|--------------------|
| Aave v3 USDC | `7e0661bf-8cf3-45e6-9424-31916d4c7b84` |
| Moonwell USDC | `69cf831d-624a-4f23-b5e3-c0f63ad1fa01` |

---

## Metrics Calculated

| Metric | Description |
|--------|-------------|
| **Ending Value** | Final portfolio value after fees and slippage |
| **Net Return** | (Ending - Starting) / Starting × 100 |
| **Gas Fees** | Total transaction costs from rebalancing |
| **Rebalances** | Count of vault reallocations |
| **Sharpe Ratio** | Risk-adjusted return (annualized) |
| **Max Drawdown** | Maximum peak-to-trough decline |
| **Uptime** | Percentage of days with positive yield |

---

## Current Results

| Rank | Strategy | Ending Value | Net Return | Gas Fees | Rebalances | Sharpe |
|------|----------|-------------|------------|----------|------------|--------|
| 1 | Unflat (Static) | $1,089.23 | +8.92% | $0.00 | 0 | 1.90 |
| 2 | DeepSeek Agent | $695.30 | -30.47% | $212.50 | 51 | -0.24 |
| 3 | GPT-4o Agent | $664.85 | -33.51% | $230.00 | 54 | -0.26 |
| 4 | Claude Sonnet Agent | $182.31 | -81.77% | $517.50 | 127 | -0.57 |

**Key Insight:** Claude Sonnet chases yield most aggressively → most rebalances → most gas burned → worst net return.

---

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
├── LEADERBOARD_SPEC.md        # This file
├── DEPLOYMENT.md              # Deploy guide
└── README.md                  # Project overview
```

---

## Tech Stack

**Frontend:**
- HTML5
- Tailwind CSS (via CDN)
- Vanilla JavaScript
- Inter font (Google Fonts)

**Simulation:**
- Node.js (simulate.js + scripts/fetch-apy.js)
- Real historical APY data (Morpho GraphQL + DeFiLlama)
- Static JSON output (pre-calculated results)

**Hosting:**
- Vercel (recommended)
- Netlify (alternative)
- GitHub Pages (free option)
- Only `index.html` + `backtest-data.json` needed for deployment

---

## Page Design

### Visual Style
- Dark background (#0f172a), light text (#f1f5f9)
- Table with dark header (#1e293b)
- Green for positive values, red for negative
- Inter font family
- Responsive: mobile-first, table scrolls horizontally

### Sections
1. **Header** — Logo + navigation
2. **Hero** — "Can AI Beat a Simple Strategy?" with key stats
3. **Leaderboard Table** — Dynamic, populated from backtest-data.json
4. **Insight Cards** — Winner, Best Sharpe, Loser (dynamic)
5. **Methodology** — How we tested (11 sources, real gas, real APY, 365 days)
6. **CTA** — "Try Unflat" button
7. **Footer** — Built by Unflat, disclaimer

---

**Last Updated:** 2026-03-16
**Status:** Implemented and deployed
