// backend/controllers/ingest.js
const { runIngest } = require('../services/ingest');
const fs = require('fs');
const path = require('path');

const CHANNELS_DIR = process.env.CHANNELS_PATH || '/channels';
const TOKEN = process.env.INGEST_TOKEN || '';

function auth(req) {
  if (!TOKEN) return true;
  const hdr = req.headers['authorization'] || '';
  return hdr.startsWith('Bearer ') && hdr.split(' ',2)[1] === TOKEN;
}

function mountIngestRoutes(app) {
  app.post('/api/ingest', async (req, res) => {
    if (!auth(req)) return res.status(401).json({ error: 'Unauthorized' });
    const force = String(req.query.force) === 'true';
    try { res.json(await runIngest(force)); }
    catch (e) { res.status(500).json({ error: String(e && e.message || e) }); }
  });

  app.get('/api/ingest/status', (req, res) => {
    try {
      const p = path.join(CHANNELS_DIR, 'state.json');
      return res.json({ state: fs.existsSync(p) ? JSON.parse(fs.readFileSync(p,'utf-8')) : {} });
    } catch { return res.json({ state: {} }); }
  });
}

module.exports = { mountIngestRoutes };
