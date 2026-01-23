
// backend/routes/epgRoutes.js
const express = require("express");
const router = express.Router();

const ChannelService = require("../services/ChannelService");
const { loadXmltv } = require("../services/epgService");
const { mapEpgToChannels } = require("../services/epgMappingService");
const { getPlaylistIndexes, normKey } = require("../services/playlistMetaService");

// Your helper (enrichChannelsWithTvg) goes here...
async function enrichChannelsWithTvg(channels) {
  const byPlaylist = new Map();
  for (const ch of channels) {
    if (!ch.playlist) continue;
    if (!byPlaylist.has(ch.playlist)) byPlaylist.set(ch.playlist, []);
    byPlaylist.get(ch.playlist).push(ch);
  }

  for (const [playlistUrl, list] of byPlaylist.entries()) {
    const { mapByUrl, mapByName } = await getPlaylistIndexes(playlistUrl);

    for (const ch of list) {
      if (ch.tvgId) continue;

      const byUrl = mapByUrl.get(normKey(ch.url));
      if (byUrl?.tvgId) {
        ch.tvgId = byUrl.tvgId;
        if (!ch.avatar && byUrl.tvgLogo) ch.avatar = byUrl.tvgLogo;
        continue;
      }

      const byName = mapByName.get(normKey(ch.name));
      if (byName?.tvgId) {
        ch.tvgId = byName.tvgId;
        if (!ch.avatar && byName.tvgLogo) ch.avatar = byName.tvgLogo;
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

    // 2) Get channels from the app
    let channels = ChannelService.getChannels();

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
