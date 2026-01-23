
const { getPlaylistIndexes, normKey } = require("../services/playlistMetaService");

async function enrichChannelsWithTvg(channels) {
  // group channels by playlist URL (so we fetch each playlist once)
  const byPlaylist = new Map();
  for (const ch of channels) {
    if (!ch.playlist) continue;
    if (!byPlaylist.has(ch.playlist)) byPlaylist.set(ch.playlist, []);
    byPlaylist.get(ch.playlist).push(ch);
  }

  for (const [playlistUrl, list] of byPlaylist.entries()) {
    const { mapByUrl, mapByName } = await getPlaylistIndexes(playlistUrl);

    for (const ch of list) {
      if (ch.tvgId) continue; // already set

      // ✅ 1) Match by stream URL (best)
      const byUrl = mapByUrl.get(normKey(ch.url));
      if (byUrl?.tvgId) {
        ch.tvgId = byUrl.tvgId;
        if (!ch.avatar && byUrl.tvgLogo) ch.avatar = byUrl.tvgLogo;
        continue;
      }

      // 2) Fallback by name
      const byName = mapByName.get(normKey(ch.name));
      if (byName?.tvgId) {
        ch.tvgId = byName.tvgId;
        if (!ch.avatar && byName.tvgLogo) ch.avatar = byName.tvgLogo;
      }
    }
  }

  return channels;
}
