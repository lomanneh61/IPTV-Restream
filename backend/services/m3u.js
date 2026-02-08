// backend/services/m3u.js
const ATTR_RE = /([\w-]+)="([^"]*)"/g;

/** Parse M3U into [{name,url, group-title, tvg-id, tvg-name, tvg-logo, tvg-language, tvg-country}] */
function parseM3U(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const out = [];
  let cur = null;

  for (const line of lines) {
    if (line.startsWith('#EXTINF')) {
      cur = {};
      const attrs = {};
      let m; while ((m = ATTR_RE.exec(line)) !== null) attrs[m[1]] = m[2];
      cur['tvg-id']       = attrs['tvg-id'] || '';
      cur['tvg-name']     = attrs['tvg-name'] || '';
      cur['tvg-logo']     = attrs['tvg-logo'] || '';
      cur['group-title']  = attrs['group-title'] || '';
      cur['tvg-language'] = attrs['tvg-language'] || '';
      cur['tvg-country']  = attrs['tvg-country'] || '';
      const idx = line.indexOf(',');
      cur.name = idx >= 0 ? line.slice(idx + 1).trim() : 'Unknown';
    } else if (!line.startsWith('#') && cur) {
      cur.url = line;
      out.push(cur);
      cur = null;
    }
  }
  return out;
}

module.exports = { parseM3U };
