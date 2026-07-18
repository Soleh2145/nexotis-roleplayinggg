const discord = require("../lib/discord");
const kvStore = require("../lib/kv");
const { setSessionCookie } = require("../lib/auth");

const SESSION_TTL_SEC = 12 * 60 * 60;

module.exports = async (req, res) => {
  const { code, error } = req.query;

  // 1. Cek jika user cancel login
  if (error || !code) {
    return res.redirect(`/index.html?error=${encodeURIComponent(error || "Login dibatalkan.")}`);
  }

  try {
    // 2. Tukar code dengan token
    const token = await discord.exchangeCode(code);
    
    // 3. Ambil data user
    const identity = await discord.getUserIdentity(token.access_token);

    // 4. Cek apakah dia member server kita
    const member = await discord.getGuildMember(identity.id);
    if (!member) {
      return res.redirect(`/index.html?error=${encodeURIComponent("Kamu bukan member server Discord Kepolisian Nexotis.")}`);
    }

    // 5. Olah data pangkat & identitas
    const roles = member.roles || [];
    const pangkat = discord.resolvePangkat(roles);
    const isHighCommand = discord.isHighCommand(roles);
    const username = member.nick || identity.username;
    const avatar = identity.avatar
      ? `https://cdn.discordapp.com/avatars/${identity.id}/${identity.avatar}.png`
      : `https://cdn.discordapp.com/embed/avatars/0.png`;

    // 6. Simpan/Update di Database (KV)
    const users = (await kvStore.getUsers()) || [];
    let userIndex = users.findIndex((u) => u.id === identity.id);
    
    const userData = { 
      id: identity.id, 
      username, 
      pangkat, 
      isHighCommand, 
      avatar, 
      lastLogin: Date.now() 
    };

    if (userIndex !== -1) {
      users[userIndex] = { ...users[userIndex], ...userData };
    } else {
      users.push({ ...userData, rate: 8 }); // User baru
    }
    
    await kvStore.setUsers(users);

    // 7. Set Cookie & Redirect ke Dashboard
    setSessionCookie(res, identity.id, SESSION_TTL_SEC);
    res.redirect("/dashboard.html");

  } catch (err) {
    console.error("LOGIN_ERROR:", err.message);
    res.redirect(`/index.html?error=${encodeURIComponent("Gagal login: " + err.message)}`);
  }
};
