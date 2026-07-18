const crypto = require("crypto");
const kvStore = require("../lib/kv");
const { getUserFromReq } = require("../lib/auth");

module.exports = async (req, res) => {
  const user = await getUserFromReq(req);
  if (!user) return res.status(401).json({ error: "Belum login." });

  const absensiAll = await kvStore.getAbsensi();

  if (req.method === "GET") {
    return res.json({ absensi: absensiAll.filter((a) => a.userId === user.id) });
  }

  if (req.method === "POST") {
    const { tipe, tanggal, waktuMulai, waktuSelesai, cutiMulai, cutiSelesai, foto, keterangan } = req.body || {};
    if (!["hadir", "izin", "cuti"].includes(tipe)) return res.status(400).json({ error: "Tipe tidak valid." });
    if (tipe === "hadir" && !foto) return res.status(400).json({ error: "Bukti foto wajib untuk laporan hadir." });
    if (tipe === "cuti" && (!cutiMulai || !cutiSelesai)) return res.status(400).json({ error: "Periode cuti wajib diisi." });

    const record = {
      id: crypto.randomBytes(8).toString("hex"),
      userId: user.id,
      tanggal: tanggal || new Date().toISOString().slice(0, 10),
      tipe,
      waktuMulai: tipe === "hadir" ? waktuMulai : null,
      waktuSelesai: tipe === "hadir" ? waktuSelesai : null,
      cutiMulai: tipe === "cuti" ? cutiMulai : null,
      cutiSelesai: tipe === "cuti" ? cutiSelesai : null,
      foto: foto || null,
      keterangan: keterangan || "",
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    absensiAll.push(record);
    await kvStore.setAbsensi(absensiAll);
    return res.json({ ok: true, record });
  }

  res.status(405).json({ error: "Method tidak didukung." });
};
