const discord = require("../lib/discord");

module.exports = (req, res) => {
  res.json({ url: discord.buildAuthorizeUrl() });
};
