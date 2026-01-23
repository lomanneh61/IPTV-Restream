const express = require("express");
const router = express.Router();
const { loadEPG } = require("../services/epgService");

router.get("/", async (req, res) => {
  try {
    const epg = await loadEPG(process.env.EPG_URL);
    res.json(epg);
  } catch (err) {
    res.status(500).json({ error: "Failed to load EPG" });
  }
});

module.exports = router;

