
const axios = require("axios");

const cache = new Map(); // playlistUrl -> { fetchedAt, map }
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 min

function cleanName(s) {
  return (s || "")
    .toLowerCase()
    .replace(/^us\s*-\s*/i, "")                 // remove "US - "
    .replace(/[◉•●]/g, "")                      // remove markers
    .replace(/\(.*?\)/g, "")                    // remove station tags "(KOMO)"
    .replace(/\bhd\b|\bfhd\b|\buhd\b/gi, "")    // remove quality tags
    .replace(/\s+/g, " ")
    .trim();
}

function parseExtinf(line) {
  const tvgId = (line.match(/tvg-id="([^"]*)"/i) || [])[1] || "";
  const tvgName = (line.match(/tvg-name="([^"]*)"/i) || [])[1] || "";
  const tvgLogo = (line.match(/tvg-logo="([^"]*)"/i) || [])[1] || "";

  // Channel display name is after the last comma
  const parts = line.split(",");
  const displayName = parts.length > 1 ? parts.slice(1).join(",").trim() : "";

  return { tvgId, tvgName, tvgLogo, displayName };
}

function parseM3U(text) {
  const lines = text.split(/\r?\n/);
  const out = [];

  for (const line of lines) {
    if (line.startsWith("#EXTINF:")) {
      out.push(parseExtinf(line));
    }
  }
  return out;
}

async function getPlaylistChannelIndex(playlistUrl) {
  if (!playlistUrl) return new Map();

  const now = Date.now();
  const cached = cache.get(playlistUrl);
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.map;
  }

  const res = await axios.get(playlistUrl, {
    timeout: 20000,
    responseType: "text",
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    headers: {
      "User-Agent": "IPTV-Restream",
      "Accept": "*/*",
    },
    validateStatus: (s) => s >= 200 && s < 300,
  });

  const entries = parseM3U(res.data);

  // map normalized display name -> metadata
  const map = new Map();
  for (const e of entries) {
    const key1 = cleanName(e.displayName);
    const key2 = cleanName(e.tvgName);
    if (key1 && e.tvgId && !map.has(key1)) map.set(key1, e);
    if (key2 && e.tvgId && !map.has(key2)) map.set(key2, e);
  }

  cache.set(playlistUrl, { fetchedAt: now, map });
  return map;
}

module.exports = { getPlaylistChannelIndex, cleanName };
