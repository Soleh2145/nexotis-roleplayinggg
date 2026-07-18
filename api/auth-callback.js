const discord = require("../lib/discord");
const kvStore = require("../lib/kv");
const { setSessionCookie } = require("../lib/auth");

const SESSION_TTL_SEC = 12 * 60 * 60;

function fail(res, message) {
  res.redirect(`/index.html?error=${encodeURIComponent(message)}`);
}

// Cek env var penting DULU sebelum manggil Discord sama sekali, biar kalau ada
// yang belum diisi/salah, pesannya langsung jelas nunjuk ke variabel mana.
function checkRequiredEnv() {
  const required = [
    "DISCORD_CLIENT_ID",
    "DISCORD_CLIENT_SECRET",
    "DISCORD_REDIRECT_URI",
    "DISCORD_BOT_TOKEN",
    "DISCORD_GUILD_ID",
    "SESSION_SECRET",
  ];
  return required.filter((key) => !process.env[key]);
}

module.exports = async (req, res) => {
  const { code, error } = req.query;
  if (error || !code) {
    return fail(res, error || "Login dibatalkan.");
  }

  const missingEnv = checkRequiredEnv();
  if (missingEnv.length) {
    console.error("Env var belum diisi:", missingEnv.join(", "));
    return fail(res, `Konfigurasi server belum lengkap: ${missingEnv.join(", ")} belum diisi di Environment Variables Vercel.`);
  }

  let identity;
  try {
    const token = await discord.exchangeCode(code);
    identity = await discord.getUserIdentity(token.access_token);
  } catch (err) {
    console.error("[auth-callback] exchangeCode/getUserIdentity gagal:", err.message);
    return fail(res, "Gagal tukar kode OAuth ke Discord — cek DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, dan DISCORD_REDIRECT_URI di Environment Variables.");
  }

  let member;
  try {
    // scope "identify" tidak memberi role — role diambil terpisah lewat bot,
    // sekaligus jadi bukti dia benar member guild kepolisian.
    member = await discord.getGuildMember(identity.id);
  } catch (err) {
    console.error("[auth-callback] getGuildMember gagal:", err.message);
    const hint = err.message.includes("401")
      ? "DISCORD_BOT_TOKEN salah/kedaluwarsa"
      : err.message.includes("403")
      ? "bot belum di-invite ke server, atau permission-nya kurang"
      : "cek DISCORD_GUILD_ID / status bot";
    return fail(res, `Bot Discord gagal mengecek keanggotaan kamu (${hint}).`);
  }

  if (!member) {
    return fail(res, "Kamu belum jadi member server Discord kepolisian.");
  }

  const roles = member.roles || [];
  const pangkat = discord.resolvePangkat(roles);
  const isHighCommand = discord.isHighCommand(roles);
  const username = member.nick || identity.username;
  const avatar = identity.avatar
    ? `https://cdn.discordapp.com/avatars/${identity.id}/${identity.avatar}.png`
    : null;

  try {
    const users = await kvStore.getUsers();
    let user = users.find((u) => u.id === identity.id);
    if (user) {
      Object.assign(user, { username, pangkat, isHighCommand, avatar });
    } else {
      user = { id: identity.id, username, pangkat, isHighCommand, avatar, rate: 8 };
      users.push(user);
    }
    await kvStore.setUsers(users);
  } catch (err) {
    console.error("[auth-callback] simpan ke KV gagal:", err.message);
    return fail(res, "Gagal simpan data ke database — pastikan Vercel KV sudah dibuat dan di-Connect ke project ini (tab Storage).");
  }

  try {
    setSessionCookie(res, identity.id, SESSION_TTL_SEC);
  } catch (err) {
    console.error("[auth-callback] buat sesi gagal:", err.message);
    return fail(res, "Gagal membuat sesi login — cek SESSION_SECRET sudah diisi di Environment Variables.");
  }

  res.redirect("/dashboard.html");
};
