const axios = require("axios");
const { XMLParser } = require("fast-xml-parser");

// Cache to avoid re-downloading a big EPG on every click
const cache = {
  url: null,
  fetchedAt: 0,
  parsed: null, // parsed XMLTV JSON
};

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  // XMLTV often contains HTML-ish descriptions; keep text as-is
  trimValues: true,
});

async function fetchAndParseXmltv(url) {
  const res = await axios.get(url, {
    timeout: 30000,
    responseType: "text",
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    headers: {
      "User-Agent": "IPTV-Restream",
      "Accept": "application/xml,text/xml,*/*",
    },
    validateStatus: (s) => s >= 200 && s < 300,
  });

  // Parse XML -> JS object
  const parsed = parser.parse(res.data);

  // XMLTV root is usually <tv>
  if (!parsed || !parsed.tv) {
    throw new Error("Invalid XMLTV: missing <tv> root");
  }

  return parsed.tv;
}

async function loadXmltv(url) {
  if (!url) throw new Error("EPG_URL is missing");

  const now = Date.now();
  const cacheValid =
    cache.parsed &&
    cache.url === url &&
    now - cache.fetchedAt < CACHE_TTL_MS;

  if (cacheValid) {
    return {
      tv: cache.parsed,
      meta: {
        sourceUrl: url,
        fetchedAt: new Date(cache.fetchedAt).toISOString(),
        cached: true,
      },
    };
  }

  const tv = await fetchAndParseXmltv(url);

  cache.url = url;
  cache.fetchedAt = now;
  cache.parsed = tv;

  return {
    tv,
    meta: {
      sourceUrl: url,
      fetchedAt: new Date(now).toISOString(),
      cached: false,
    },
  };
}

module.exports = { loadXmltv };
