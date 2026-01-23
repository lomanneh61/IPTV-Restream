const axios = require("axios");
const xml2js = require("xml2js");

async function loadEPG(epgUrl) {
  const xml = (await axios.get(epgUrl)).data;
  const parsed = await xml2js.parseStringPromise(xml);

  return {
    channels: parsed.tv.channel,
    programs: parsed.tv.programme
  };
}

module.exports = { loadEPG };
