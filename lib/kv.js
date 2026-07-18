// Penyimpanan pakai Vercel KV — aktifkan lewat dashboard Vercel (tab Storage),
// env var (KV_REST_API_URL, KV_REST_API_TOKEN, dst) otomatis ke-inject ke
// project, tidak perlu setup manual. Ini pengganti data/db.json versi lama
// yang tidak bisa dipakai di serverless (filesystem-nya ephemeral).

const { kv } = require("@vercel/kv");

async function getUsers() { return (await kv.get("nexotis:users")) || []; }
async function setUsers(users) { await kv.set("nexotis:users", users); }
async function getAbsensi() { return (await kv.get("nexotis:absensi")) || []; }
async function setAbsensi(absensi) { await kv.set("nexotis:absensi", absensi); }

module.exports = { getUsers, setUsers, getAbsensi, setAbsensi };
