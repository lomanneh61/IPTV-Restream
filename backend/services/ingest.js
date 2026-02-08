// backend/services/ingest.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const https = require('https');
const { parseM3U } = require('./m3u');

const CHANNELS_DIR = process.env.CHANNELS_PATH || '/channels';
const PLAYLIST_URL = process.env.PLAYLIST_URL || '';
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || '').replace(/\/+$/,'');
const READMETITLE = process.env.INGEST_README_TITLE || 'IPTV Index';
const MAX_ITEMS_PER_FILE = parseInt(process.env.MAX_ITEMS_PER_FILE || '1000', 10) || 0;

const VOD_RX = (process.env.VOD_MARKERS || '(?i)\\bvod\\b, (?i)\\bmovie(s)?\\b, /movie/')
  .split(',').map(s => s.trim()).filter(Boolean).map(p => new RegExp(p));
const SERIES_RX = (process.env.SERIES_MARKERS || '(?i)\\bseries\\b, (?i)S\\d{1,2}E\\d{1,2}, /series/')
  .split(',').map(s => s.trim()).filter(Boolean).map(p => new RegExp(p));

const STATE_FILE = path.join(CHANNELS_DIR, 'state.json');

function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }
function sha256(b)  { return crypto.createHash('sha256').update(b).digest('hex'); }

function hget(url, headers={}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { headers }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(hget(res.headers.location, headers));
      }
      if (res.statusCode !== 200) return reject(new Error(`GET ${url} -> ${res.statusCode}`));
      const chunks = [];
      res.on('data', d => chunks.push(d));
      res.on('end', () => resolve({ body: Buffer.concat(chunks), headers: res.headers }));
    });
    req.on('error', reject);
  });
}

function hhead(url, headers={}) {
  return new Promise((resolve) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.request(url, { method: 'HEAD', headers }, res => resolve(res.headers || {}));
    req.on('error', () => resolve({}));
    req.end();
  });
}

function loadState() { try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')); } catch { return {}; } }
function saveState(s) { ensureDir(path.dirname(STATE_FILE)); fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2)); }

async function shouldReingest() {
  const st = loadState();
  const head = await hhead(PLAYLIST_URL);

  if (head.etag && st.etag && head.etag === st.etag) return { changed: false, headers: head };
  if (head['last-modified'] && st.last_modified && head['last-modified'] === st.last_modified) return { changed: false, headers: head };

  const r = await hget(PLAYLIST_URL);
  const hash = sha256(r.body);
  if (st.sha256 && st.sha256 === hash) return { changed: false, headers: r.headers };
  return { changed: true, headers: r.headers, body: r.body, bodyHash: hash };
}

function classify(list) {
  const live = [], vod = [], series = [];
  for (const e of list) {
    const t = `${e.name} ${e['group-title']} ${e.url}`;
    if (SERIES_RX.some(rx => rx.test(t))) series.push(e);
    else if (VOD_RX.some(rx => rx.test(t))) vod.push(e);
    else live.push(e);
  }
  return { live, vod, series };
}

function bucketize(entries) {
  const split = {
    g: process.env.SPLIT_BY_GROUP   === 'true',
    l: process.env.SPLIT_BY_LANGUAGE=== 'true',
    c: process.env.SPLIT_BY_COUNTRY === 'true',
  };
  const buckets = new Map();
  for (const e of entries) {
    const k = [
      split.g ? (e['group-title']  || 'Unknown') : null,
      split.l ? (e['tvg-language'] || 'Unknown') : null,
      split.c ? (e['tvg-country']  || 'Unknown') : null
    ].filter(Boolean).join(' | ') || 'all';
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(e);
  }
  const out = [];
  for (const [name, items] of buckets) {
    if (MAX_ITEMS_PER_FILE && items.length > MAX_ITEMS_PER_FILE) {
      const chunks = Math.ceil(items.length / MAX_ITEMS_PER_FILE);
      for (let i = 0; i < chunks; i++) {
        out.push([`${name} (${i+1}/${chunks})`, items.slice(i*MAX_ITEMS_PER_FILE, (i+1)*MAX_ITEMS_PER_FILE)]);
      }
    } else out.push([name, items]);
  }
  out.sort((a,b) => a[0].localeCompare(b[0]));
  return out;
}

function safe(s) { return String(s).replace(/[^A-Za-z0-9._-]+/g,'_').replace(/^_+|_+$/g,''); }
function asM3U(name, items) {
  const L = ['#EXTM3U'];
  for (const e of items) {
    const A=[];
    if (e['tvg-id'])       A.push(`tvg-id="${e['tvg-id']}"`);
    if (e['tvg-name'])     A.push(`tvg-name="${e['tvg-name']}"`);
    if (e['tvg-logo'])     A.push(`tvg-logo="${e['tvg-logo']}"`);
    if (e['group-title'])  A.push(`group-title="${e['group-title']}"`);
    if (e['tvg-language']) A.push(`tvg-language="${e['tvg-language']}"`);
    if (e['tvg-country'])  A.push(`tvg-country="${e['tvg-country']}"`);
    L.push(`#EXTINF:-1 ${A.join(' ')},${e.name || 'Unknown'}`);
    L.push(e.url);
  }
  return L.join('\n');
}

function writeSection(rootRel, items) {
  const meta = [];
  for (const [name, entries] of items) {
    const fname = `${safe(name)}.m3u`;
    const rel   = path.join(rootRel, fname);
    const abs   = path.join(CHANNELS_DIR, rel);
    ensureDir(path.dirname(abs));
    fs.writeFileSync(abs, asM3U(name, entries), 'utf-8');
    fs.writeFileSync(abs.replace(/\.m3u$/,'.json'), JSON.stringify({ name, count: entries.length }, null, 2));
    meta.push({ name, count: entries.length, relPath: rel });
  }
  return meta;
}

function buildIndex(sections) {
  const now = new Date().toISOString();
  const idx = { title: READMETITLE, description: "Auto-split LIVE/VOD/SERIES indexes", generated_at: now, live:[], vod:[], series:[] };
  const add = (arr, key) => {
    for (const i of arr) {
      const url  = PUBLIC_BASE_URL ? `${PUBLIC_BASE_URL}/${i.relPath.replace(/\\/g,'/')}` : i.relPath;
      idx[key].push({ name: i.name, count: i.count, url, json: url.replace(/\.m3u$/, '.json') });
    }
  };
  add(sections.liveOut, 'live'); add(sections.vodOut, 'vod'); add(sections.seriesOut, 'series');
  fs.writeFileSync(path.join(CHANNELS_DIR, 'index.json'), JSON.stringify(idx, null, 2));
  const md = [
    `# ${READMETITLE}`, '', `Generated: \`${now}\``, '',
    '## LIVE',   ...idx.live.map(x => `- **${x.name}** — ${x.count}\n  - M3U: ${x.url}\n  - JSON: ${x.json}`), '',
    '## VOD',    ...idx.vod.map(x => `- **${x.name}** — ${x.count}\n  - M3U: ${x.url}\n  - JSON: ${x.json}`), '',
    '## SERIES', ...idx.series.map(x => `- **${x.name}** — ${x.count}\n  - M3U: ${x.url}\n  - JSON: ${x.json}`), ''
  ].join('\n');
  fs.writeFileSync(path.join(CHANNELS_DIR, 'README.md'), md, 'utf-8');
}

async function runIngest(force=false) {
  if (!PLAYLIST_URL) throw new Error('PLAYLIST_URL is not configured');

  let payload, head = {};
  if (!force) {
    const r = await shouldReingest();
    if (!r.changed) return { status: 'noop', reason: 'not changed' };
    payload = { body: r.body, headers: r.headers, hash: r.bodyHash };
    head = r.headers || {};
  } else {
    const r = await hget(PLAYLIST_URL);
    payload = { body: r.body, headers: r.headers, hash: sha256(r.body) };
    head = r.headers || {};
  }

  const entries = parseM3U(payload.body.toString('utf-8'));
  const { live, vod, series } = classify(entries);
  const liveOut   = writeSection('live',   bucketize(live));
  const vodOut    = writeSection('vod',    bucketize(vod));
  const seriesOut = writeSection('series', bucketize(series));
  buildIndex({ liveOut, vodOut, seriesOut });

  const st = { updated_at: new Date().toISOString(), sha256: payload.hash, etag: head.etag, last_modified: head['last-modified'],
               counts: { all: entries.length, live: live.length, vod: vod.length, series: series.length } };
  saveState(st);
  return { status: 'ok', counts: st.counts, files: ['index.json','README.md'] };
}

module.exports = { runIngest };
