
const axios = require("axios");

/**
 * Load EPG XML from a URL (XMLTV).
 * @param {string} url - EPG URL (e.g. http://.../epg.xml or epg.xml.gz)
 * @returns {Promise<{url: string, xml: string, fetchedAt: string}>}
 */
async function loadEPG(url) {
  if (!url) {
    throw new Error("EPG_URL is missing (process.env.EPG_URL is undefined)");
  }

  const res = await axios.get(url, {
    // Avoid hanging forever
    timeout: 20000, // 20 seconds

    // We want the raw XML as text (not JSON)
    responseType: "text",

    // Allow big EPG files
    maxContentLength: Infinity,
    maxBodyLength: Infinity,

    // Helpful headers
    headers: {
      "User-Agent": "IPTV-Restream",
      "Accept": "application/xml,text/xml,*/*",
    },

    // Only treat 2xx as success
    validateStatus: (status) => status >= 200 && status < 300,
  });

  return {
    url,
    xml: res.data,
    fetchedAt: new Date().toISOString(),
  };
}

module.exports = { loadEPG };
