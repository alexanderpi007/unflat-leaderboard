#!/usr/bin/env node

/**
 * Fetch historical APY data for Morpho vaults + comparison protocols.
 *
 * Sources:
 *   - Morpho vaults:  https://blue-api.morpho.org/graphql  (weekly apy snapshots)
 *   - Aave / Moonwell: https://yields.llama.fi/chart/{pool} (daily snapshots)
 *
 * Output: data/historical-apy.json
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ============================================================================
// CONFIGURATION
// ============================================================================

const DAYS = 365;
const MORPHO_ENDPOINT = 'https://blue-api.morpho.org/graphql';
const DEFILLAMA_CHART = 'https://yields.llama.fi/chart';
const CHAIN_ID = 8453; // Base

// Morpho vaults on Base — addresses pulled from the live API (top vaults by TVL)
const MORPHO_VAULTS = {
  'steakhouse-usdc':    '0xbeeF010f9cb27031ad51e3333f9aF9C6B1228183',
  're7-usdc':           '0x12AFDeFb2237a5963e7BAb3e2D46ad0eee70406e',
  'steakhouse-prime':   '0xBEEFE94c8aD530842bfE7d8B397938fFc1cb83b2',
  'steakhouse-hy':      '0xBEEFA7B88064FeEF0cEe02AAeBBd95D30df3878F',
  'moonwell-flagship':  '0xc1256Ae5FF1cf2719D4937adb3bbCCab2E00A2Ca',
  'gauntlet-frontier':  '0x236919F11ff9eA9550A4287696C2FC9e18E6e890',
  'clearstar-reactor':  '0x1D3b1Cd0a0f242d598834b3F2d126dC6bd774657',
  'extrafi-xlend':      '0x23479229e52Ab6aaD312D0B03DF9F33B46753B5e',
  'gauntlet-prime':     '0xeE8F4eC5672F09119b96Ab6fB59C27E1b7e44b61',
};

// DeFiLlama pool IDs (found via /pools endpoint, chain=Base, symbol=USDC)
const PROTOCOL_POOLS = {
  'aave-usdc':     '7e0661bf-8cf3-45e6-9424-31916d4c7b84',
  'moonwell-usdc': '69cf831d-624a-4f23-b5e3-c0f63ad1fa01',
};

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

// ============================================================================
// HTTP HELPERS
// ============================================================================

function httpsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString();
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

async function fetchWithRetry(fn, label) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      console.error(`  [attempt ${attempt}/${MAX_RETRIES}] ${label}: ${err.message}`);
      if (attempt === MAX_RETRIES) throw err;
      await sleep(RETRY_DELAY_MS * attempt);
    }
  }
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ============================================================================
// DATE HELPERS
// ============================================================================

function dateStr(d) {
  return d.toISOString().split('T')[0];
}

function buildDateRange(days) {
  const dates = [];
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    dates.push(dateStr(d));
  }
  return dates;
}

/**
 * Interpolate weekly Morpho snapshots into a daily series.
 *
 * Raw points come as {x: unixTimestamp, y: apyDecimal} at ~7-day intervals.
 * We linear-interpolate between them to fill every calendar day.
 */
function interpolateToDaily(rawPoints, targetDates) {
  // Sort chronologically and filter out obvious bad data (>200% APY spikes)
  const sorted = rawPoints
    .map((p) => ({ ts: p.x, apy: p.y * 100 })) // decimal → percent
    .filter((p) => p.apy >= 0 && p.apy < 200)
    .sort((a, b) => a.ts - b.ts);

  if (sorted.length === 0) {
    return targetDates.map((d) => ({ date: d, apy: 0 }));
  }

  // Build a lookup: for each target date find the surrounding data points and lerp
  return targetDates.map((dateString) => {
    const ts = new Date(dateString + 'T00:00:00Z').getTime() / 1000;

    // Before earliest data → use first known value
    if (ts <= sorted[0].ts) {
      return { date: dateString, apy: round(sorted[0].apy) };
    }
    // After latest data → use last known value
    if (ts >= sorted[sorted.length - 1].ts) {
      return { date: dateString, apy: round(sorted[sorted.length - 1].apy) };
    }

    // Find bracketing points
    let lo = 0;
    let hi = sorted.length - 1;
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].ts <= ts && sorted[i + 1].ts >= ts) {
        lo = i;
        hi = i + 1;
        break;
      }
    }

    const span = sorted[hi].ts - sorted[lo].ts;
    const t = span > 0 ? (ts - sorted[lo].ts) / span : 0;
    const apy = sorted[lo].apy + t * (sorted[hi].apy - sorted[lo].apy);
    return { date: dateString, apy: round(apy) };
  });
}

/**
 * Map DeFiLlama daily chart data onto our target date range.
 * Fill forward for missing days.
 */
function alignDefillamaToDaily(chartData, targetDates) {
  // Build a map date → apy
  const byDate = {};
  for (const pt of chartData) {
    const d = pt.timestamp.split('T')[0];
    byDate[d] = pt.apy ?? pt.apyBase ?? 0;
  }

  let lastKnown = 0;
  return targetDates.map((d) => {
    if (byDate[d] !== undefined) {
      lastKnown = byDate[d];
    }
    return { date: d, apy: round(lastKnown) };
  });
}

function round(n) {
  return Math.round(n * 100) / 100; // 2 decimal places
}

// ============================================================================
// FETCH: MORPHO
// ============================================================================

async function fetchMorphoVault(id, address, targetDates) {
  const query = `{
    vaultByAddress(address: "${address}", chainId: ${CHAIN_ID}) {
      name
      historicalState {
        apy { x y }
      }
    }
  }`;

  const data = await fetchWithRetry(
    () => httpsRequest(MORPHO_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    }),
    `Morpho ${id}`,
  );

  const vault = data?.data?.vaultByAddress;
  if (!vault) {
    console.warn(`  ⚠ Vault not found: ${id} (${address})`);
    return { name: id, series: targetDates.map((d) => ({ date: d, apy: 0 })) };
  }

  const rawPoints = vault.historicalState.apy || [];
  console.log(`  ✓ ${vault.name}: ${rawPoints.length} raw data points`);

  return {
    name: vault.name,
    series: interpolateToDaily(rawPoints, targetDates),
  };
}

// ============================================================================
// FETCH: DEFILLAMA
// ============================================================================

async function fetchDefillamaPool(id, poolId, targetDates) {
  const url = `${DEFILLAMA_CHART}/${poolId}`;

  const data = await fetchWithRetry(
    () => httpsRequest(url),
    `DeFiLlama ${id}`,
  );

  const chartData = data?.data || [];
  console.log(`  ✓ ${id}: ${chartData.length} daily data points`);

  return {
    name: id,
    series: alignDefillamaToDaily(chartData, targetDates),
  };
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log(`\nFetching ${DAYS} days of historical APY data...\n`);

  const targetDates = buildDateRange(DAYS);
  console.log(`Date range: ${targetDates[0]} → ${targetDates[targetDates.length - 1]}\n`);

  // --- Morpho vaults ---
  console.log('Morpho vaults:');
  const morphoResults = {};
  const morphoEntries = Object.entries(MORPHO_VAULTS);

  for (const [id, address] of morphoEntries) {
    try {
      const result = await fetchMorphoVault(id, address, targetDates);
      morphoResults[address] = result.series;
      // small delay to be polite to the API
      await sleep(300);
    } catch (err) {
      console.error(`  ✗ ${id}: FAILED after ${MAX_RETRIES} retries — ${err.message}`);
      morphoResults[address] = targetDates.map((d) => ({ date: d, apy: 0 }));
    }
  }

  // --- Comparison protocols ---
  console.log('\nComparison protocols:');
  const protocolResults = {};

  for (const [id, poolId] of Object.entries(PROTOCOL_POOLS)) {
    try {
      const result = await fetchDefillamaPool(id, poolId, targetDates);
      protocolResults[id] = result.series;
      await sleep(300);
    } catch (err) {
      console.error(`  ✗ ${id}: FAILED — ${err.message}`);
      protocolResults[id] = targetDates.map((d) => ({ date: d, apy: 0 }));
    }
  }

  // --- Write output ---
  const output = {
    fetchedAt: new Date().toISOString(),
    dateRange: { from: targetDates[0], to: targetDates[targetDates.length - 1] },
    days: DAYS,
    morpho: morphoResults,
    protocols: protocolResults,
  };

  const outPath = path.join(__dirname, '..', 'data', 'historical-apy.json');
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

  // --- Summary ---
  console.log(`\n✅ Saved to ${outPath}`);
  console.log(`   Morpho vaults: ${Object.keys(morphoResults).length}`);
  console.log(`   Protocols:     ${Object.keys(protocolResults).length}`);

  // Quick sanity check: print avg APY for each source
  console.log('\nAverage APY (last 30 days):');
  for (const [id, address] of morphoEntries) {
    const series = morphoResults[address];
    const last30 = series.slice(-30);
    const avg = last30.reduce((s, p) => s + p.apy, 0) / last30.length;
    console.log(`  ${id.padEnd(22)} ${avg.toFixed(2)}%`);
  }
  for (const [id, series] of Object.entries(protocolResults)) {
    const last30 = series.slice(-30);
    const avg = last30.reduce((s, p) => s + p.apy, 0) / last30.length;
    console.log(`  ${id.padEnd(22)} ${avg.toFixed(2)}%`);
  }

  console.log('');
}

main().catch((err) => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
