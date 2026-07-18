const discord = require("../lib/discord");
const kvStore = require("../lib/kv");
const { setSessionCookie } = require("../lib/auth");

const SESSION_TTL_SEC = 12 * 60 * 60;

module.exports = async (req, res) => {
  const { code, error } = req.query;
  if (error || !code) {
    res.redirect(`/index.html?error=${encodeURIComponent(error || "Login dibatalkan.")}`);
    return;
  }

  try {
    const token = await discord.exchangeCode(code);
    const identity = await discord.getUserIdentity(token.access_token);

    // scope "identify" tidak memberi role — role diambil terpisah lewat bot,
    // sekaligus jadi bukti dia benar member guild kepolisian.
    const member = await discord.getGuildMember(identity.id);
    if (!member) {
      res.redirect(`/index.html?error=${encodeURIComponent("Kamu belum jadi member server Discord kepolisian.")}`);
      return;
    }

    const roles = member.roles || [];
    const pangkat = discord.resolvePangkat(roles);
    const isHighCommand = discord.isHighCommand(roles);
    const username = member.nick || identity.username;
    const avatar = identity.avatar
      ? `https://cdn.discordapp.com/avatars/${identity.id}/${identity.avatar}.png`
      : null;

    const users = await kvStore.getUsers();
    let user = users.find((u) => u.id === identity.id);
    if (user) {
      Object.assign(user, { username, pangkat, isHighCommand, avatar });
    } else {
      user = { id: identity.id, username, pangkat, isHighCommand, avatar, rate: 8 };
      users.push(user);
    }
    await kvStore.setUsers(users);

    setSessionCookie(res, identity.id, SESSION_TTL_SEC);
    res.redirect("/dashboard.html");
  } catch (err) {
    console.error(err);
    res.redirect(`/index.html?error=${encodeURIComponent("Gagal login lewat Discord, coba lagi.")}`);
  }
};
