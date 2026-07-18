const kvStore = require("../../../lib/kv");
const { getUserFromReq } = require("../../../lib/auth");

module.exports = async (req, res) => {
  const user = await getUserFromReq(req);
  if (!user) return res.status(401).json({ error: "Belum login." });
  if (!user.isHighCommand) return res.status(403).json({ error: "Khusus High Command." });
  if (req.method !== "POST") return res.status(405).json({ error: "Method tidak didukung." });

  const { status } = req.body || {};
  if (!["diterima", "ditolak"].includes(status)) return res.status(400).json({ error: "Status tidak valid." });

  const { id } = req.query;
  const absensi = await kvStore.getAbsensi();
  const rec = absensi.find((a) => a.id === id);
  if (!rec) return res.status(404).json({ error: "Laporan tidak ditemukan." });
  rec.status = status;
  await kvStore.setAbsensi(absensi);
  res.json({ ok: true });
};
