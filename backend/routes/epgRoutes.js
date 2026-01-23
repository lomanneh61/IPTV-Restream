
const express = require("express");
const router = express.Router();

const ChannelService = require("../services/ChannelService");
const { loadXmltv } = require("../services/epgService");
const { mapEpgToChannels } = require("../services/epgMappingService");

const { getPlaylistChannelIndex, cleanName } = require("../services/playlistMetaService");

async function enrichChannelsWithTvg(channels) {
  // Group by playlist URL to avoid fetching the same playlist repeatedly
  const byPlaylist = new Map();
  for (const ch of channels) {
    if (ch.playlist) {
      if (!byPlaylist.has(ch.playlist)) byPlaylist.set(ch.playlist, []);
      byPlaylist.get(ch.playlist).push(ch);
    }
  }

  // For each playlist, fetch + build an index, then enrich channels
  for (const [playlistUrl, chList] of byPlaylist.entries()) {
    const index = await getPlaylistChannelIndex(playlistUrl);

    for (const ch of chList) {
      if (ch.tvgId) continue; // already has one (future-proof)

      const key = cleanName(ch.name);
      const meta = index.get(key);
      if (meta && meta.tvgId) {
        ch.tvgId = meta.tvgId;

        // Also align logo: your schema uses "avatar"
        if (!ch.avatar && meta.tvgLogo) ch.avatar = meta.tvgLogo;
      }
    }
  }

  return channels;
}

router.get("/", async (req, res) => {
  try {
    const url = process.env.EPG_URL;
    if (!url) return res.status(400).json({ error: "EPG_URL is not set" });

    const rangeHours = Number(req.query.hours || 24);

    const { tv, meta } = await loadXmltv(url);

    let channels = ChannelService.getChannels();

    // ✅ NEW: enrich with tvgId from playlist
    channels = await enrichChannelsWithTvg(channels);

    const { mapped, unmatched } = mapEpgToChannels({ channels, tv });

    res.json({
      meta: { ...meta, rangeHours },
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

