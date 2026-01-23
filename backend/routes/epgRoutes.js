
const { getPlaylistIndexes, normKey } = require("../services/playlistMetaService");

async function enrichChannelsWithTvg(channels) {
  const byPlaylist = new Map();

  for (const ch of channels) {
    if (!ch?.playlist) continue;
    if (!byPlaylist.has(ch.playlist)) byPlaylist.set(ch.playlist, []);
    byPlaylist.get(ch.playlist).push(ch);
  }

  for (const [playlistUrl, list] of byPlaylist.entries()) {
    let indexes;

    try {
      indexes = await getPlaylistIndexes(playlistUrl);
    } catch (err) {
      console.error(`[EPG] Failed to load playlist: ${playlistUrl}`, err?.message || err);
      continue; // don't break all channels if one playlist fails
    }

    const { mapByUrl, mapByName } = indexes;

    for (const ch of list) {
      if (!ch || ch.tvgId) continue;

      const chUrlKey = ch.url ? normKey(ch.url) : "";
      const chNameKey = ch.name ? normKey(ch.name) : "";

      // 1) Match by stream URL (best)
      if (chUrlKey) {
        const byUrl = mapByUrl.get(chUrlKey);
        if (byUrl?.tvgId) {
          ch.tvgId = byUrl.tvgId;
          if (!ch.avatar && byUrl.tvgLogo) ch.avatar = byUrl.tvgLogo;
          continue;
        }
      }

      // 2) Fallback by name
      if (chNameKey) {
        const byName = mapByName.get(chNameKey);
        if (byName?.tvgId) {
          ch.tvgId = byName.tvgId;
          if (!ch.avatar && byName.tvgLogo) ch.avatar = byName.tvgLogo;
        }
      }
    }
  }

  return channels;
}

module.exports = { enrichChannelsWithTvg };
