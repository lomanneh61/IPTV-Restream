
/**
 * Normalize an ID or name to improve matching.
 * Example: "CNN.us" -> "cnn.us"
 */
function norm(s) {
  return (s || "").toString().trim().toLowerCase();
}

/**
 * Convert XMLTV datetime (e.g. "20260123180000 -0800") to Date
 * Returns a JS Date object.
 */
function parseXmltvDate(xmltvDate) {
  if (!xmltvDate) return null;
  // xmltv format: YYYYMMDDHHMMSS +/-ZZZZ
  const m = xmltvDate.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-]\d{4})?$/);
  if (!m) return null;

  const [_, Y, Mo, D, H, Mi, S, tz] = m;
  const iso = `${Y}-${Mo}-${D}T${H}:${Mi}:${S}${tz ? tzToIsoOffset(tz) : "Z"}`;
  const dt = new Date(iso);
  return isNaN(dt.getTime()) ? null : dt;
}

function tzToIsoOffset(tz) {
  // "+0130" -> "+01:30"
  return tz.slice(0, 3) + ":" + tz.slice(3);
}

/**
 * Build an index of programs by channel id.
 * XMLTV "programme" can be object or array depending on parser.
 */
function indexProgrammesByChannel(tv) {
  const programmes = tv.programme
    ? Array.isArray(tv.programme) ? tv.programme : [tv.programme]
    : [];

  const byChannel = new Map();

  for (const p of programmes) {
    const ch = norm(p["@_channel"]);
    if (!ch) continue;

    const start = parseXmltvDate(p["@_start"]);
    const stop = parseXmltvDate(p["@_stop"]);

    const title = extractText(p.title);
    const desc = extractText(p.desc);

    const entry = { start, stop, title, desc, raw: p };
    if (!byChannel.has(ch)) byChannel.set(ch, []);
    byChannel.get(ch).push(entry);
  }

  // sort each channel by start time
  for (const [ch, arr] of byChannel.entries()) {
    arr.sort((a, b) => (a.start?.getTime() || 0) - (b.start?.getTime() || 0));
  }

  return byChannel;
}

function extractText(node) {
  if (!node) return "";
  // fast-xml-parser can produce:
  // title: "News" OR title: { "#text": "News", "@_lang": "en" } OR title: [ ... ]
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return extractText(node[0]);
  if (typeof node === "object") {
    if (node["#text"]) return node["#text"];
    // sometimes value is directly on object
    const keys = Object.keys(node).filter(k => !k.startsWith("@_"));
    if (keys.length === 1 && typeof node[keys[0]] === "string") return node[keys[0]];
  }
  return "";
}

/**
 * Main mapping: for each IPTV-Restream channel, choose an EPG channel id.
 * Strategy:
 *  1) match channel.tvgId (or channel.tvg_id) to xmltv <channel id="">
 *  2) fallback: match by name normalized if you want (optional)
 */
function mapEpgToChannels({ channels, tv }) {
  // XMLTV channels list (may be array/object)
  const xmlChannels = tv.channel
    ? Array.isArray(tv.channel) ? tv.channel : [tv.channel]
    : [];
  const xmlChannelIds = new Set(xmlChannels.map(c => norm(c["@_id"])));

  const programmesByChannel = indexProgrammesByChannel(tv);

  const now = new Date();

  const mapped = [];
  const playlistTvgIds = [];
  const matchedXmlIds = new Set();

  for (const ch of channels) {
    // Adapt to whatever your ChannelController returns:
    // common fields: tvgId, tvg_id, name/title, logo
    const tvgId = ch.tvgId || ch.tvg_id || ch.tvgID || "";
    const name = ch.name || ch.title || "";
    const logo = ch.logo || ch.tvgLogo || ch.tvg_logo || "";

    const normTvg = norm(tvgId);
    playlistTvgIds.push(normTvg);

    let epgChannelId = null;

    // 1) Direct tvg-id match
    if (normTvg && xmlChannelIds.has(normTvg)) {
      epgChannelId = normTvg;
    }

    // 2) OPTIONAL: fallback by name (only if you want)
    // if (!epgChannelId) {
    //   const normName = norm(name);
    //   // try find an xml channel with same display-name
    //   epgChannelId = findXmlChannelIdByDisplayName(xmlChannels, normName);
    // }

    const programmes = epgChannelId ? (programmesByChannel.get(epgChannelId) || []) : [];

    // limit programmes to a window
    const nowMs = now.getTime();
    const future = programmes.filter(p => (p.stop?.getTime() || 0) >= nowMs);

    const current = future.find(p => (p.start?.getTime() || 0) <= nowMs && (p.stop?.getTime() || 0) >= nowMs) || null;
    const next = future.filter(p => (p.start?.getTime() || 0) > nowMs).slice(0, 12);

    if (epgChannelId) matchedXmlIds.add(epgChannelId);

    mapped.push({
      channelId: ch.id || ch.channelId || null,
      name,
      logo,
      tvgId,
      epgChannelId,
      now: current ? serializeProgramme(current) : null,
      next: next.map(serializeProgramme),
      programmeCount: programmes.length,
      matched: Boolean(epgChannelId),
    });
  }

  // Unmatched diagnostics
  const unmatchedEpgIds = [...xmlChannelIds].filter(id => !matchedXmlIds.has(id));

  return {
    mapped,
    unmatched: {
      epgChannelIds: unmatchedEpgIds.slice(0, 200),
      playlistTvgIds: [...new Set(playlistTvgIds.filter(Boolean))].slice(0, 200),
    },
  };
}

function serializeProgramme(p) {
  return {
    title: p.title || "",
    desc: p.desc || "",
    start: p.start ? p.start.toISOString() : null,
    stop: p.stop ? p.stop.toISOString() : null,
  };
}

module.exports = { mapEpgToChannels };
