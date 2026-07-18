const kvStore = require("./kv");
const session = require("./session");

const SESSION_COOKIE = "nexotis_session";

async function getUserFromReq(req) {
  const token = req.cookies?.[SESSION_COOKIE];
  const payload = session.verify(token);
  if (!payload) return null;
  const users = await kvStore.getUsers();
  return users.find((u) => u.id === payload.discordId) || null;
}

function setSessionCookie(res, discordId, maxAgeSec) {
  const token = session.sign({ discordId, exp: Date.now() + maxAgeSec * 1000 });
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}`);
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
}

module.exports = { getUserFromReq, setSessionCookie, clearSessionCookie };
