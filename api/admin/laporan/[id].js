const kvStore = require("../../../lib/kv");
const { getUserFromReq } = require("../../../lib/auth");
const { notifyStatusDiproses } = require("../../../lib/discord");

module.exports = async (req, res) => {
  const user = await getUserFromReq(req);
  if (!user) return res.status(401).json({ error: "Belum login." });
  if (!user.isHighCommand) return res.status(403).json({ error: "Khusus High Command." });
  if (req.method !== "POST") return res.status(405).json({ error: "Method tidak didukung." });

  const { status, alasan } = req.body || {};
  if (!["diterima", "ditolak"].includes(status)) return res.status(400).json({ error: "Status tidak valid." });

  const { id } = req.query;
  const absensi = await kvStore.getAbsensi();
  const rec = absensi.find((a) => a.id === id);
  if (!rec) return res.status(404).json({ error: "Laporan tidak ditemukan." });
  rec.status = status;
  rec.alasan = status === "ditolak" ? (alasan || "").trim() : null;
  await kvStore.setAbsensi(absensi);

  const users = await kvStore.getUsers();
  const pelapor = users.find((u) => u.id === rec.userId);
  if (pelapor) await notifyStatusDiproses(pelapor, user, rec);

  res.json({ ok: true });
};
