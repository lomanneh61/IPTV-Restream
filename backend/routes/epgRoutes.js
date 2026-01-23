
const express = require("express");
const router = express.Router();

const ChannelService = require("../services/ChannelService");
const { loadXmltv } = require("../services/epgService");
const { mapEpgToChannels } = require("../services/epgMappingService");

router.get("/", async (req, res) => {
  try {
    const url = process.env.EPG_URL;
    if (!url) return res.status(400).json({ error: "EPG_URL is not set" });

    // How far ahead to include (optional query param)
    const rangeHours = Number(req.query.hours || 24);

    const { tv, meta } = await loadXmltv(url);

    // Get IPTV-Restream channels (whatever your project stores)
    const channels = ChannelService.getChannels();

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
