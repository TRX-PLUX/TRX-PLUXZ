# 🤖 TroxzyMD - WhatsApp Multi Device Bot

TroxzyMD adalah bot WhatsApp modular berbasis Baileys yang dirancang untuk berjalan di panel Pterodactyl, VPS, Linux, dan macOS.
Bot ini mendukung AI chat, image generation, premium payment, downloader multi-platform, sticker engine custom, anti-spam, dan sistem plugin yang mudah dikembangkan.

---

## 🚀 Fitur Utama

- Plugin modular: cukup tambahkan file `.js` di `plugins/<kategori>/`
- AI chat modern: `glm/glm-5.2`, TTS, STT, image generation
- Premium payment: QRIS manual + dukungan Midtrans otomatis
- Anti-blokir: delay human-like, anti-flood, rate limiter, warm-up mode
- Sticker custom: `sharp` + `node-webpmux`
- Kompatibel dengan Node.js 20-24

---

## 📌 Persyaratan

- Node.js 20.x hingga 24.x
- npm terbaru
- Akses internet untuk AI dan downloader
- Nomor WhatsApp bot aktif
- Folder kerja `TroxzyMD`

---

## ⚠️ Catatan Penting

1. `OWNER_NUMBER` harus dalam format internasional tanpa `+` atau spasi, misal `6281234567890`.
2. `BOT_NUMBER` opsional, tetapi sangat disarankan untuk pairing karena bot bisa memakai nomor ini langsung tanpa prompt manual.
3. `AI_API_KEY` wajib diisi di `.env`.
4. `assets/qris.jpg` harus berisi QRIS kamu sendiri.
5. `SESSION_METHOD` bisa diatur ke `pairing` atau `qr` sesuai kebutuhan Pterodactyl.
5. Bot menggunakan Baileys v7 (`7.0.0-rc13`) agar lebih kompatibel dengan panel hosting.
6. Downloader menggunakan API pihak ketiga gratis, jadi bisa berubah sewaktu-waktu.
7. Sticker engine custom sudah dibuat untuk menghindari dependency rentan.
8. `lib/baileysHelper.js` menangani import Baileys ESM di proyek CommonJS.
9. `msg.key.participant` bisa berupa ID LID — plugin custom harus mempertimbangkan fallback `participantAlt`.

---

## ✅ Setup Umum

### 1. Clone repository

```bash
git clone https://github.com/TRX-FLOWRX/TRX-BT.git
cd TRX-BT/TroxzyMD
```

### 2. Install dependency

```bash
npm install
```

Jika ada masalah dengan `sharp`:

```bash
npm install sharp
```

### 3. Buat file `.env`

Buat file `.env` di dalam folder `TroxzyMD` dan isikan minimal:

```env
OWNER_NUMBER=6281234567890
BOT_NUMBER=6281234567890
AI_API_KEY=your_api_key_here
SESSION_METHOD=pairing
MIDTRANS_SERVER_KEY=
MIDTRANS_CLIENT_KEY=
MIDTRANS_IS_PRODUCTION=false
BOT_NAME=TroxzyMD
OWNER_NAME=Troxzy
CHANNEL_LINK=https://whatsapp.com/channel/xxxxx
PUBLIC_MODE=true
```

### 4. Upload QRIS

Letakkan file QRIS kamu di `assets/qris.jpg`.

### 5. Jalankan bot

```bash
node index.js
```

---

## 🖥️ Setup di Pterodactyl

### A. Working Directory

Pastikan working directory berada di dalam folder `TroxzyMD`.

Jika panel kamu menjalankan dari root repo, arahkan startup command ke `TroxzyMD/index.js`.

### B. Startup Command

```
node index.js
```

### C. Environment Variables

Pastikan file `.env` berada di folder `TroxzyMD`.

### D. Install Dependency

Buka console dan jalankan:

```bash
npm install
```

### E. Jalankan bot

Klik Start, lalu ketika diminta masukkan nomor WhatsApp.

Jika panel tidak mendukung input interaktif, ubah `SESSION_METHOD=qr` di `.env` dan gunakan QR code dari console.

---

## 🐧 Setup di VPS / Linux

### A. Install persyaratan

```bash
sudo apt update && sudo apt install -y git curl build-essential pkg-config python3 libvips-dev libvips-tools
```

### B. Clone dan jalankan

```bash
git clone https://github.com/TRX-FLOWRX/TRX-BT.git
cd TRX-BT/TroxzyMD
npm install
node index.js
```

---

## 🍎 Setup di macOS

### A. Install persyaratan

```bash
brew install node pkg-config libvips python3
```

### B. Clone dan jalankan

```bash
git clone https://github.com/TRX-FLOWRX/TRX-BT.git
cd TRX-BT/TroxzyMD
npm install
node index.js
```

Jika `sharp` gagal, jalankan:

```bash
npm install sharp --force
npm rebuild sharp
```

---

## 🔧 Konfigurasi `.env`

Contoh konfigurasi minimal:

```env
OWNER_NUMBER=6281234567890
BOT_NUMBER=6281234567890
AI_API_KEY=your_api_key_here
SESSION_METHOD=pairing
MIDTRANS_SERVER_KEY=
MIDTRANS_CLIENT_KEY=
MIDTRANS_IS_PRODUCTION=false
BOT_NAME=TroxzyMD
OWNER_NAME=Troxzy
CHANNEL_LINK=https://whatsapp.com/channel/xxxxx
PUBLIC_MODE=true
```

---

## 📱 Perintah Utama

| Perintah | Fungsi |
|---|---|
| `.menu` | Menu cepat |
| `.allmenu` | Semua command |
| `.ai <pertanyaan>` | Chat AI |
| `.persona` | Ganti persona AI |
| `.imagine <prompt>` | Generate gambar |
| `.tts <teks>` | Text to speech |
| `.tovoice` | Speech to text |
| `.ringkas <url>` | Ringkas artikel |
| `.tiktok <link>` | Download TikTok |
| `.ig <link>` | Download Instagram |
| `.ytmp4 <link>` / `.ytmp3 <link>` | Download YouTube |
| `.sticker` | Buat stiker |
| `.buy <paket>` | Beli premium |
| `.daily` | Klaim reward harian |
| `.tukarlimit <jumlah>` | Tukar saldo jadi limit |

---

## 👑 Owner Commands

| Perintah | Fungsi |
|---|---|
| `.addpremium <nomor> <hari>` | Tambah premium |
| `.approve <trx_id>` | Approve pembayaran |
| `.reject <trx_id> <alasan>` | Tolak pembayaran |
| `.ban <nomor>` | Ban user |
| `.unban <nomor>` | Unban user |
| `.broadcast <pesan>` | Broadcast semua user |
| `.stats` | Statistik bot |
| `.aidiag` | Diagnosa AI |
| `.sessioninfo` | Info sesi |
| `.toggle selfmode` | Mode self owner |
| `.restart` | Restart bot |
| `.reload` | Reload plugin |

---

## 🧩 Menambah Plugin Baru

Taruh file `.js` baru di `plugins/<kategori>/`, lalu jalankan `.reload`.

Contoh struktur plugin:

```js
module.exports = {
  command: ['mycommand', 'alias'],
  category: 'tools',
  description: 'Deskripsi singkat',
  premium: false,
  ownerOnly: false,
  groupOnly: false,
  privateOnly: false,
  adminOnly: false,
  cooldown: 0,
  limitCost: 1,
  execute: async (msg, { sock, jid, args, text, sender, isGroup, isOwner, user }) => {
    await sock.sendMessage(jid, { text: 'Halo dari plugin baru!' }, { quoted: msg });
  }
};
```

---

## 🐛 Troubleshooting

- `npm install` error `EALLOWLIST`: pastikan `@whiskeysockets/baileys` di `package.json` adalah `^7.0.0-rc13`.
- `sharp` gagal: jalankan `npm install sharp` atau `npm rebuild sharp`.
- Bot tidak connect: hapus folder `sessions/` lalu restart.
- Downloader error: cek `lib/downloader.js`.
- Sticker gagal: pastikan `sharp` terinstall.

---

## 📦 Catatan Deploy

Jika menjalankan di panel Pterodactyl, pastikan working directory berada di dalam `TroxzyMD`.
Jika bot dijalankan dari root repo `TRX-BT`, arahkan startup command ke `TroxzyMD/index.js`.

---

## ✨ Ringkasan

TroxzyMD dibuat untuk fleksibilitas, kualitas, dan kompatibilitas panel. Gunakan dengan benar, backup `sessions/` sebelum perubahan besar, dan jalankan di environment yang stabil.
