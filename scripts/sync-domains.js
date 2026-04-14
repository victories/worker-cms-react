#!/usr/bin/env node
/**
 * sync-domains.js
 *
 * Reads all site_domains from D1 database and ensures they are registered
 * as Custom Domains on the Cloudflare Worker.
 *
 * Runs automatically after `wrangler deploy` via package.json "deploy" script.
 * Can also be run standalone: node scripts/sync-domains.js
 *
 * Requires: wrangler OAuth login (uses the stored OAuth token)
 */

const fs = require('fs');
const path = require('path');

// Config
const ACCOUNT_ID = 'YOUR_CLOUDFLARE_ACCOUNT_ID';
const WORKER_NAME = 'wp-cms';
const DB_ID = 'YOUR_D1_DATABASE_ID';

// Domains to skip (workers.dev subdomains)
const SKIP_PATTERNS = ['.workers.dev'];

function getOAuthToken() {
  const configPaths = [
    path.join(process.env.APPDATA || '', 'xdg.config', '.wrangler', 'config', 'default.toml'),
    path.join(process.env.HOME || '', '.wrangler', 'config', 'default.toml'),
    path.join(process.env.XDG_CONFIG_HOME || '', '.wrangler', 'config', 'default.toml'),
  ];

  for (const p of configPaths) {
    try {
      const content = fs.readFileSync(p, 'utf8');
      const match = content.match(/oauth_token\s*=\s*"([^"]+)"/);
      if (match) return match[1];
    } catch {}
  }
  throw new Error('Could not find wrangler OAuth token. Run `wrangler login` first.');
}

let _token = null;
function cfApi(method, endpoint, body) {
  if (!_token) _token = getOAuthToken();
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${_token}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);
  return fetch(`https://api.cloudflare.com/client/v4${endpoint}`, opts).then(r => r.json());
}

async function getZones() {
  const zones = {};
  let page = 1;
  while (true) {
    const data = await cfApi('GET', `/zones?account.id=${ACCOUNT_ID}&per_page=50&page=${page}`);
    if (!data.result || data.result.length === 0) break;
    for (const z of data.result) zones[z.name] = z.id;
    if (data.result.length < 50) break;
    page++;
  }
  return zones;
}

async function getCurrentWorkerDomains() {
  const data = await cfApi('GET', `/accounts/${ACCOUNT_ID}/workers/domains?service=${WORKER_NAME}&environment=production`);
  return (data.result || []).map(d => d.hostname);
}

async function getDbDomains() {
  // Query D1 directly via Cloudflare API
  const data = await cfApi('POST', `/accounts/${ACCOUNT_ID}/d1/database/${DB_ID}/query`, {
    sql: 'SELECT domain FROM site_domains'
  });

  if (data.success && data.result && data.result[0]?.results) {
    return data.result[0].results.map(r => r.domain);
  }

  console.error('   Failed to query D1:', JSON.stringify(data.errors || data));
  return [];
}

function getZoneForDomain(hostname, zones) {
  const parts = hostname.split('.');
  for (let i = 0; i < parts.length - 1; i++) {
    const candidate = parts.slice(i).join('.');
    if (zones[candidate]) return zones[candidate];
  }
  return null;
}

async function main() {
  console.log('\n\uD83D\uDD04 Syncing custom domains to Cloudflare Worker...\n');

  // 1. Get all zones on the account
  console.log('\uD83D\uDCCB Fetching Cloudflare zones...');
  const zones = await getZones();
  console.log(`   Found ${Object.keys(zones).length} zones\n`);

  // 2. Get currently registered worker domains
  console.log('\uD83D\uDD0D Fetching current Worker domains...');
  const currentDomains = await getCurrentWorkerDomains();
  console.log(`   Currently registered: ${currentDomains.join(', ')}\n`);

  // 3. Get all domains from D1 database
  console.log('\uD83D\uDCBE Fetching domains from D1 database...');
  const dbDomains = await getDbDomains();
  console.log(`   Found in DB: ${dbDomains.join(', ')}\n`);

  // 4. Find domains that need to be added
  const toAdd = dbDomains.filter(d => {
    if (SKIP_PATTERNS.some(p => d.includes(p))) return false;
    if (currentDomains.includes(d)) return false;
    return true;
  });

  if (toAdd.length === 0) {
    console.log('\u2705 All domains are already registered. Nothing to do.\n');
    return;
  }

  console.log(`\uD83D\uDE80 Adding ${toAdd.length} domain(s)...\n`);

  let added = 0, failed = 0;
  for (const hostname of toAdd) {
    const zoneId = getZoneForDomain(hostname, zones);
    if (!zoneId) {
      console.log(`   \u26A0\uFE0F  ${hostname} \u2014 no matching zone found on this account, skipping`);
      failed++;
      continue;
    }

    const result = await cfApi('PUT', `/accounts/${ACCOUNT_ID}/workers/domains`, {
      hostname,
      zone_id: zoneId,
      service: WORKER_NAME,
      environment: 'production',
    });

    if (result.success) {
      console.log(`   \u2705 ${hostname} \u2014 added`);
      added++;
    } else {
      const errMsg = result.errors?.[0]?.message || 'Unknown error';
      console.log(`   \u274C ${hostname} \u2014 ${errMsg}`);
      failed++;
    }
  }

  console.log(`\n\uD83C\uDFC1 Domain sync complete. Added: ${added}, Failed: ${failed}\n`);
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
