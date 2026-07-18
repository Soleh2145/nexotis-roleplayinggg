# Kepolisian Nexotis — versi Vercel (serverless)

Struktur project ini dirancang khusus supaya jalan normal di Vercel:

- **`/api/*.js`** → tiap file otomatis jadi 1 serverless function (tidak
  pakai Express — Vercel sudah kasih `req.query`, `req.cookies`,
  `req.body` (auto-parse JSON), `res.json()`, `res.redirect()` bawaan).
- **File HTML/CSS/JS di root** (`index.html`, `dashboard.html`, dst) →
  otomatis disajikan sebagai static hosting oleh Vercel, tanpa config tambahan.
- **Sesi login** → stateless, disimpan sebagai cookie yang ditandatangani
  (HMAC), BUKAN di memori server. Ini penting karena tiap request di
  Vercel bisa "landing" di instance serverless yang berbeda-beda.
- **Data (users & absensi)** → disimpan di **Vercel KV** (key-value
  store bawaan Vercel), bukan file lokal — filesystem serverless
  bersifat sementara dan tidak boleh diandalkan untuk data permanen.

## Alur login

1. User klik "Login with Discord" → OAuth2 (`scope=identify`)
2. Discord redirect ke `/api/auth-callback?code=...`
3. Function itu tukar `code` → identitas Discord user, lalu **pakai bot**
   untuk mengecek dia member guild kepolisian & baca role-nya
4. Pangkat & status High Command ditentukan dari role (`DISCORD_RANK_MAP`,
   `DISCORD_HIGH_COMMAND_ROLE_IDS`)
5. Cookie sesi dibuat → redirect ke dashboard

## Setup & Deploy

1. **Push project ini ke GitHub** (repo baru)

2. **Import ke Vercel**
   - vercel.com → Add New → Project → pilih repo tadi
   - Vercel otomatis kenali ini sebagai static + serverless functions, tidak perlu ubah build settings

3. **Aktifkan Vercel KV**
   - Di dashboard project → tab **Storage** → Create Database → **KV**
   - Connect ke project ini → env var KV otomatis ditambahkan, tidak perlu diisi manual

4. **Isi Environment Variables** (Project Settings → Environment Variables)
   Isi semua yang ada di `.env.example` KECUALI bagian KV (sudah otomatis):
   - `SESSION_SECRET`
   - `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`
   - `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`
   - `DISCORD_RANK_MAP`, `DISCORD_HIGH_COMMAND_ROLE_IDS`

5. **Buat Discord Application**
   - https://discord.com/developers/applications → New Application
   - Tab **OAuth2 → General**: salin Client ID & Client Secret
   - Tab **OAuth2 → Redirects**: tambahkan `https://nama-project.vercel.app/api/auth-callback`
     (harus PERSIS sama dengan `DISCORD_REDIRECT_URI` di env vars)
   - Tab **Bot**: Reset Token, salin, aktifkan **Server Members Intent**
   - Undang bot ke server (OAuth2 URL Generator, scope `bot`, permission View Channels)

6. **Deploy** (otomatis tiap push ke branch utama, atau klik Deploy manual di dashboard)

7. Setelah deploy pertama, kamu tahu domain aslinya (`https://xxx.vercel.app`)
   — pastikan `DISCORD_REDIRECT_URI` di env vars & di Discord Developer Portal
   sama-sama pakai domain final ini, lalu redeploy kalau sempat kamu ganti.

## Coba lokal sebelum deploy (opsional)

```bash
npm install -g vercel
vercel link          # hubungkan folder ini ke project Vercel kamu
vercel env pull .env.local   # tarik semua env vars (termasuk KV) ke lokal
vercel dev            # jalan di http://localhost:3000, functions & KV ikut jalan
```

## Catatan penting

- **Belum di-deploy/test di sandbox pembuatan ini** (tidak ada akses
  jaringan & tidak ada akun Vercel di sini) — kemungkinan ada penyesuaian
  kecil yang baru ketahuan pas deploy beneran. Kalau ada error di Vercel
  Function Logs, kirim ke saya, saya bantu debug.
- **Reset Semua Duty** (Panel Rekap, khusus High Command) menghapus
  SELURUH riwayat absensi semua anggota permanen — tidak ada undo.
- Batas ukuran Vercel KV: cocok untuk skala anggota kecil-menengah dengan
  foto bukti sebagai base64. Kalau nanti banyak sekali foto beresolusi
  besar, sebaiknya pindahkan foto ke Vercel Blob Storage (bukan disimpan
  base64 di dalam record KV) supaya lebih hemat.
- Foto absensi tetap dikirim sebagai base64 di body JSON — untuk foto besar,
  pertimbangkan kompres di sisi browser dulu sebelum upload biar tidak
  melebihi limit ukuran request serverless function.
