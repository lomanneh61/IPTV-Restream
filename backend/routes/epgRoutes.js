
// backend/routes/epgRoutes.js
const express = require("express");
const router = express.Router();

const ChannelService = require("../services/ChannelService");
const { loadXmltv } = require("../services/epgService");
const { mapEpgToChannels } = require("../services/epgMappingService");
const { getPlaylistIndexes, normKey } = require("../services/playlistMetaService");

/**
 * Enrich channels by deriving tvgId (and optionally avatar) from their playlist M3U.
 * - Groups by playlist URL so each playlist is fetched once
 * - Matches by stream URL first (best), then by name (fallback)
 * - Wraps playlist fetching in try/catch so one broken playlist doesn't break EPG
 */
async function enrichChannelsWithTvg(channels) {
  // group channels by playlist URL (so we fetch each playlist once)
  const byPlaylist = new Map();

  for (const ch of channels) {
    if (!ch || !ch.playlist) continue;

    if (!byPlaylist.has(ch.playlist)) byPlaylist.set(ch.playlist, []);
    byPlaylist.get(ch.playlist).push(ch);
  }

  for (const [playlistUrl, list] of byPlaylist.entries()) {
    let indexes;

    // ✅ Prevent one failing playlist from breaking the entire EPG endpoint
    try {
      indexes = await getPlaylistIndexes(playlistUrl);
    } catch (err) {
      console.error(`[EPG] Failed to load playlist: ${playlistUrl}`, err?.message || err);
      continue;
    }

    const { mapByUrl, mapByName } = indexes;

    for (const ch of list) {
      if (!ch || ch.tvgId) continue; // already set

      // ✅ 1) Match by stream URL (best)
      const urlKey = ch.url ? normKey(ch.url) : "";
      if (urlKey) {
        const byUrl = mapByUrl.get(urlKey);
        if (byUrl?.tvgId) {
          ch.tvgId = byUrl.tvgId;

          // Your channel schema uses "avatar" for logo
          if (!ch.avatar && byUrl.tvgLogo) ch.avatar = byUrl.tvgLogo;
          continue;
        }
      }

      // ✅ 2) Fallback by name
      const nameKey = ch.name ? normKey(ch.name) : "";
      if (nameKey) {
        const byName = mapByName.get(nameKey);
        if (byName?.tvgId) {
          ch.tvgId = byName.tvgId;
          if (!ch.avatar && byName.tvgLogo) ch.avatar = byName.tvgLogo;
        }
      }
    }
  }

  return channels;
}

/**
 * ✅ THIS is the /api/epg route handler:
 * Because server.js mounts this router at app.use("/api/epg", epgRoutes)
 * and this handler is router.get("/")
 */
router.get("/", async (req, res) => {
  try {
    const url = process.env.EPG_URL;
    if (!url) return res.status(400).json({ error: "EPG_URL is not set" });

    const hours = Number(req.query.hours || 24);

    // 1) Load and parse the XMLTV EPG
    const { tv, meta } = await loadXmltv(url);

    // 2) Get channels from the app (clone to avoid mutating shared objects)
    let channels = ChannelService.getChannels().map((c) => ({ ...c }));

    // 3) Enrich channels with tvgId from playlist
    channels = await enrichChannelsWithTvg(channels);

    // 4) Map EPG -> channels
    const { mapped, unmatched } = mapEpgToChannels({ channels, tv, hours });

    // 5) Return combined JSON
    res.json({
      meta: { ...meta, rangeHours: hours },
      channels: mapped,
      unmatched,
    });
  } catch (err) {
    res.status(500).json({
      error: "Failed to load/map EPG",
      details: String(err?.message || err),
    });
  }
});

module.exports = router;
