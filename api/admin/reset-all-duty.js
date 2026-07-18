const kvStore = require("../../lib/kv");
const { getUserFromReq } = require("../../lib/auth");

module.exports = async (req, res) => {
  const user = await getUserFromReq(req);
  if (!user) return res.status(401).json({ error: "Belum login." });
  if (!user.isHighCommand) return res.status(403).json({ error: "Khusus High Command." });
  if (req.method !== "POST") return res.status(405).json({ error: "Method tidak didukung." });

  const absensi = await kvStore.getAbsensi();
  const resetCount = absensi.length;
  await kvStore.setAbsensi([]);
  res.json({ ok: true, resetCount });
};
