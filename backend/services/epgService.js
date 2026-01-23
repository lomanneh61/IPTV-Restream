
// backend/services/epgService.js
async function loadEPG(url) {
  if (!url) throw new Error("EPG_URL is missing");

  const res = await fetch(url, {
    headers: { "User-Agent": "IPTV-Restream" },
  });

  if (!res.ok) {
    throw new Error(`EPG fetch failed: ${res.status} ${res.statusText}`);
  }

  const xml = await res.text();
  return { xml }; // return raw XML (or parse later)
}

module.exports = { loadEPG };
