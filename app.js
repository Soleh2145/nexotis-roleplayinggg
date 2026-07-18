async function api(path, options = {}) {
  const res = await fetch(path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  let data = null;
  try { data = await res.json(); } catch (e) { /* no body */ }
  if (!res.ok) throw new Error((data && data.error) || `Terjadi kesalahan (${res.status})`);
  return data;
}

function formatMoney(n) { return "$" + Math.round(n).toLocaleString("en-US"); }
function formatTanggal(iso) {
  return new Date(iso + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}
function toISO(d) { return d.toISOString().slice(0, 10); }

function getWeekDates() {
  const today = new Date();
  const day = today.getDay() === 0 ? 7 : today.getDay();
  const monday = new Date(today); monday.setDate(today.getDate() - (day - 1));
  const out = [];
  for (let i = 0; i < 7; i++) { const d = new Date(monday); d.setDate(monday.getDate() + i); out.push(toISO(d)); }
  return out;
}
function eachDateInRange(startIso, endIso) {
  if (!startIso || !endIso) return [];
  const out = []; let d = new Date(startIso + "T00:00:00"); const end = new Date(endIso + "T00:00:00");
  while (d <= end) { out.push(toISO(d)); d.setDate(d.getDate() + 1); }
  return out;
}
function isWeekday(iso) { const wd = new Date(iso + "T00:00:00").getDay(); return wd >= 1 && wd <= 5; }
function diffMinutes(mulai, selesai) {
  const [h1, m1] = mulai.split(":").map(Number);
  const [h2, m2] = selesai.split(":").map(Number);
  let mins = (h2 * 60 + m2) - (h1 * 60 + m1);
  if (mins < 0) mins += 24 * 60;
  return mins;
}

// Hitung statistik mingguan dari daftar record absensi + rate anggota.
function calcStatsFromRecords(records, rate) {
  const week = getWeekDates();
  const todayStr = toISO(new Date());
  const hadirDays = new Set(), izinDays = new Set(), cutiDays = new Set();
  let totalMinutes = 0;

  records.forEach((a) => {
    if (a.tipe === "hadir" && week.includes(a.tanggal)) {
      hadirDays.add(a.tanggal);
      if (a.waktuMulai && a.waktuSelesai) totalMinutes += diffMinutes(a.waktuMulai, a.waktuSelesai);
    } else if (a.tipe === "izin" && week.includes(a.tanggal)) {
      izinDays.add(a.tanggal);
    } else if (a.tipe === "cuti") {
      eachDateInRange(a.cutiMulai, a.cutiSelesai).forEach((d) => { if (week.includes(d)) cutiDays.add(d); });
    }
  });

  const elapsedWeekdays = week.filter((d) => d <= todayStr && isWeekday(d));
  let alpa = 0;
  elapsedWeekdays.forEach((d) => { if (!hadirDays.has(d) && !izinDays.has(d) && !cutiDays.has(d)) alpa++; });

  const totalJam = totalMinutes / 60;
  return { totalJam, gaji: totalJam * (rate || 0), hadir: hadirDays.size, izin: izinDays.size, cuti: cutiDays.size, alpa };
}

/* ====== Navbar ====== */
function renderNavbar(activePage, user) {
  const mount = document.getElementById("navbar-mount");
  if (!mount) return;
  const initials = user.username.slice(0, 2).toUpperCase();
  const linkOrSpan = (href, label, page) =>
    activePage === page ? `<span class="active">${label}</span>` : `<a href="${href}">${label}</a>`;

  mount.innerHTML = `
    <div class="navbar">
      <div class="brand"><span class="flag">🚔</span> kepolisian nexotis</div>
      <nav>
        ${linkOrSpan("dashboard.html", "Dashboard", "dashboard")}
        ${user.isHighCommand ? linkOrSpan("rekap.html", "Panel Rekap (High Command)", "rekap") : ""}
        ${linkOrSpan("undang-undang.html", "Undang-Undang", "uu")}
      </nav>
      <div class="user">
        <div class="info">
          <div class="name">${user.username}</div>
          <div class="rank">${user.pangkat}${user.isHighCommand ? " · High Command" : ""}</div>
        </div>
        <div class="avatar">${user.avatar ? "" : initials}</div>
        <button id="logout-btn">Logout</button>
      </div>
    </div>`;
  if (user.avatar) {
    const av = mount.querySelector(".avatar");
    av.style.backgroundImage = `url('${user.avatar}')`;
    av.style.backgroundSize = "cover";
  }
  document.getElementById("logout-btn").addEventListener("click", async () => {
    await api("/api/auth/logout", { method: "POST" });
    window.location.href = "index.html";
  });
}

// Dipanggil di awal tiap halaman terproteksi (dashboard/rekap/undang-undang).
// Kalau belum login, lempar ke index.html. Return user atau null.
async function requireAuth() {
  try {
    const data = await api("/api/me");
    return data.user;
  } catch (e) {
    window.location.href = "index.html";
    return null;
  }
}
