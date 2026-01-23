
const axios = require("axios");

const cache = new Map(); // playlistUrl -> { fetchedAt, mapByUrl, mapByName }
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function norm(s) {
  return (s || "").toString().trim();
}

function normKey(s) {
  return norm(s).toLowerCase();
}

function parseExtinf(line) {
  const tvgId = (line.match(/tvg-id="([^"]*)"/i) || [])[1] || "";
  const tvgName = (line.match(/tvg-name="([^"]*)"/i) || [])[1] || "";
  const tvgLogo = (line.match(/tvg-logo="([^"]*)"/i) || [])[1] || "";
  const parts = line.split(",");
  const displayName = parts.length > 1 ? parts.slice(1).join(",").trim() : "";
  return { tvgId, tvgName, tvgLogo, displayName };
}

/**
 * Parse M3U into entries: { tvgId, displayName, tvgName, tvgLogo, streamUrl }
 * by pairing #EXTINF line with the following non-empty, non-# URL line.
 */
function parseM3U(text) {
  const lines = text.split(/\r?\n/);
  const entries = [];

  let pending = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (line.startsWith("#EXTINF:")) {
      pending = parseExtinf(line);
      continue;
    }

    // take the first non-comment line after EXTINF as stream URL
    if (pending && !line.startsWith("#")) {
      entries.push({ ...pending, streamUrl: line });
      pending = null;
    }
  }

  return entries;
}

async function getPlaylistIndexes(playlistUrl) {
  if (!playlistUrl) return { mapByUrl: new Map(), mapByName: new Map() };

  const now = Date.now();
  const cached = cache.get(playlistUrl);
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached;
  }

  const res = await axios.get(playlistUrl, {
    timeout: 20000,
    responseType: "text",
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    headers: { "User-Agent": "IPTV-Restream", "Accept": "*/*" },
    validateStatus: (s) => s >= 200 && s < 300,
  });

  const entries = parseM3U(res.data);

  const mapByUrl = new Map();
  const mapByName = new Map();

  for (const e of entries) {
    if (!e.tvgId) continue;

    // 1) Strongest mapping: stream URL
    if (e.streamUrl) {
      const k = normKey(e.streamUrl);
      if (k && !mapByUrl.has(k)) mapByUrl.set(k, e);
    }

    // 2) Fallback: displayName / tvgName
    for (const n of [e.displayName, e.tvgName]) {
      const k = normKey(n);
      if (k && !mapByName.has(k)) mapByName.set(k, e);
    }
  }

  const value = { fetchedAt: now, mapByUrl, mapByName };
  cache.set(playlistUrl, value);
  return value;
}

module.exports = { getPlaylistIndexes, normKey };
