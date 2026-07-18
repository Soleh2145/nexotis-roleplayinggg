const API = "https://discord.com/api/v10";

function botHeaders() {
  return {
    Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
    "Content-Type": "application/json",
  };
}

// Tukar "code" menjadi access_token
async function exchangeCode(code) {
  const body = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    client_secret: process.env.DISCORD_CLIENT_SECRET,
    grant_type: "authorization_code",
    code: code,
    redirect_uri: process.env.DISCORD_REDIRECT_URI,
  });

  const res = await fetch(`${API}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = await res.json();
  if (!res.ok) {
    console.error("Discord Token Error:", data);
    throw new Error(data.error_description || "Gagal tukar kode OAuth");
  }
  return data;
}

// Ambil identitas dasar user (@me)
async function getUserIdentity(accessToken) {
  const res = await fetch(`${API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Gagal ambil identitas Discord (${res.status})`);
  }
  return res.json();
}

// Ambil data member di server (cek role)
async function getGuildMember(discordId) {
  const guildId = process.env.DISCORD_GUILD_ID;
  const res = await fetch(`${API}/guilds/${guildId}/members/${discordId}`, {
    headers: botHeaders(),
  });
  
  if (res.status === 404) return null; // User tidak ada di server
  if (!res.ok) {
    const errData = await res.text();
    console.error("Guild Member Error:", errData);
    throw new Error(`Gagal akses data server Discord`);
  }
  return res.json();
}

// Olah Rank Map dari ENV
function resolvePangkat(roleIds) {
  const raw = process.env.DISCORD_RANK_MAP || "";
  const rankMap = raw.split(",").map(p => {
    const [id, name] = p.split(":");
    return { id: id?.trim(), name: name?.trim() };
  }).filter(r => r.id && r.name);

  // Cari role yang cocok (berdasarkan urutan di ENV)
  for (const mapping of rankMap) {
    if (roleIds.includes(mapping.id)) return mapping.name;
  }
  return "Anggota";
}

function isHighCommand(roleIds) {
  const highRoles = (process.env.DISCORD_HIGH_COMMAND_ROLE_IDS || "").split(",");
  return roleIds.some(id => highRoles.includes(id.trim()));
}

module.exports = {
  exchangeCode,
  getUserIdentity,
  getGuildMember,
  resolvePangkat,
  isHighCommand,
};
