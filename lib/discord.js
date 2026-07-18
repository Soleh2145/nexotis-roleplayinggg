// Helper REST Discord murni (fetch bawaan Node 18+), tanpa library discord.js
// supaya dependency tetap ringan.

const API = "https://discord.com/api/v10";

function botHeaders() {
  return {
    Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
    "Content-Type": "application/json",
  };
}

// --- OAuth2 (login "Login with Discord") ---

function buildAuthorizeUrl() {
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    redirect_uri: process.env.DISCORD_REDIRECT_URI,
    response_type: "code",
    scope: "identify",
  });
  return `${API}/oauth2/authorize?${params.toString()}`;
}

// Tukar "code" dari redirect Discord menjadi access_token OAuth user.
async function exchangeCode(code) {
  const body = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    client_secret: process.env.DISCORD_CLIENT_SECRET,
    grant_type: "authorization_code",
    code,
    redirect_uri: process.env.DISCORD_REDIRECT_URI,
  });
  const res = await fetch(`${API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gagal tukar kode OAuth (${res.status}): ${text}`);
  }
  return res.json(); // { access_token, ... }
}

// Ambil identitas dasar user (id, username, avatar) pakai access_token OAuth-nya sendiri.
async function getUserIdentity(accessToken) {
  const res = await fetch(`${API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Gagal ambil identitas Discord (${res.status}): ${text}`);
  }
  return res.json(); // { id, username, avatar, ... }
}

// --- Bot REST (butuh token bot, dipakai untuk baca role & kirim DM) ---

// Ambil data member (termasuk daftar role) dari guild yang dikonfigurasi.
// Return null kalau user tidak ditemukan di server tsb (belum join / ID salah).
async function getGuildMember(discordId) {
  const guildId = process.env.DISCORD_GUILD_ID;
  const res = await fetch(`${API}/guilds/${guildId}/members/${discordId}`, {
    headers: botHeaders(),
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Discord API error ${res.status}: ${body}`);
  }
  return res.json();
}

function parseRankMap() {
  const raw = process.env.DISCORD_RANK_MAP || "";
  return raw
    .split(",")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const [roleId, pangkat] = pair.split(":");
      return { roleId: roleId?.trim(), pangkat: pangkat?.trim() };
    })
    .filter((r) => r.roleId && r.pangkat);
}

function resolvePangkat(roleIds) {
  const rankMap = parseRankMap();
  for (const { roleId, pangkat } of rankMap) {
    if (roleIds.includes(roleId)) return pangkat;
  }
  return "Anggota";
}

function isHighCommand(roleIds) {
  const ids = (process.env.DISCORD_HIGH_COMMAND_ROLE_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  return roleIds.some((id) => ids.includes(id));
}

// Kirim DM ke user via bot: buka/ambil DM channel, lalu kirim pesan.
// Bisa gagal (403) kalau user menutup "Allow direct messages from server members".
async function sendDM(discordId, content) {
  const chRes = await fetch(`${API}/users/@me/channels`, {
    method: "POST",
    headers: botHeaders(),
    body: JSON.stringify({ recipient_id: discordId }),
  });
  if (!chRes.ok) {
    const body = await chRes.text().catch(() => "");
    throw new Error(`Gagal membuka DM channel (${chRes.status}): ${body}`);
  }
  const channel = await chRes.json();

  const msgRes = await fetch(`${API}/channels/${channel.id}/messages`, {
    method: "POST",
    headers: botHeaders(),
    body: JSON.stringify({ content }),
  });
  if (!msgRes.ok) {
    const body = await msgRes.text().catch(() => "");
    throw new Error(`Gagal mengirim DM (${msgRes.status}): ${body}`);
  }
}

module.exports = {
  buildAuthorizeUrl,
  exchangeCode,
  getUserIdentity,
  getGuildMember,
  resolvePangkat,
  isHighCommand,
  sendDM,
};
