# 🤖 WhatsApp Sticker Bot (Baileys)

Bot WhatsApp ringan untuk membuat stiker dari gambar, video, dan GIF — tanpa Puppeteer/Chromium. Dibangun dengan [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys).

---

## ✨ Fitur

- 🖼️ Konversi gambar (JPG/PNG/WebP) ke stiker WhatsApp
- 🎬 Konversi video/GIF ke stiker animasi WebP
- ✍️ Tambah teks (atas & bawah) dengan auto-wrap dan auto-shrink font
- 🛡️ Anti-spam dengan sistem rate limit per pengirim
- 📦 Auto-compress stiker animasi agar tidak melebihi 500KB
- 👥 Support chat pribadi dan grup
- 🔒 Metadata stiker (nama pack & author)

---

## 📋 Cara Pakai

Kirim perintah berikut di WhatsApp:

| Perintah | Keterangan |
|---|---|
| `/stiker` | Buat stiker dari gambar/video yang dikirim bersamaan |
| `/stiker` (reply ke media) | Buat stiker dari gambar/video yang di-reply |
| `/stiker atas\|bawah` | Buat stiker dengan teks atas dan bawah |

**Contoh:**
```
/stiker
/stiker HELLO WORLD
/stiker HELLO|WORLD
```

---

## ⚙️ Konfigurasi

Edit bagian `CONFIG` di `index.js`:

```js
const CONFIG = {
  prefix: '/stiker',           // Perintah trigger
  stickerAuthor: 'Bot Stiker', // Nama author stiker
  stickerName: 'Stiker Custom',// Nama pack stiker
  maxVideoDurationSec: 10,     // Durasi maksimal video (detik)
  authFolder: './auth_info',   // Folder penyimpanan sesi login
  tempFolder: './temp',        // Folder file sementara
};
```

Konfigurasi rate limit:

```js
const RATE_LIMIT = {
  cooldownMs: 8000,           // Jeda antar request (ms)
  maxRequestsPerWindow: 5,    // Maks request per menit
  windowMs: 60000,            // Durasi window (ms)
  blacklistMs: 5 * 60000,     // Durasi blacklist jika spam (ms)
};
```

---

## 🚀 Instalasi

### Prasyarat

- [Node.js](https://nodejs.org/) v18 atau lebih baru
- npm

### Langkah

1. Clone repository ini:
   ```bash
   git clone https://github.com/username/whatsapp-sticker-bot-baileys.git
   cd whatsapp-sticker-bot-baileys
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Jalankan bot:
   ```bash
   npm start
   ```

4. Login ke WhatsApp (pilih salah satu mode di `CONFIG.usePairingCode`):

   **Mode Pairing Code (default, `usePairingCode: true`):**
   - Bot akan meminta nomor HP kamu di terminal
   - Masukkan nomor dengan kode negara, tanpa `+` (contoh: `6281234567890`)
   - Buka WhatsApp → **Perangkat Tertaut** → **Tautkan dengan nomor telepon**
   - Masukkan kode pairing yang muncul di terminal

   **Mode QR Code (`usePairingCode: false`):**
   - QR code akan muncul di terminal
   - Buka WhatsApp → **Perangkat Tertaut** → **Tautkan Perangkat**
   - Arahkan kamera ke QR code di terminal

5. Setelah login berhasil, terminal akan menampilkan:
   ```
   ✅ Bot dah siap boss!
   ```

> **Catatan:** Sesi login tersimpan di folder `auth_info`. Untuk logout/reset, hapus folder tersebut lalu restart bot.

---

## 📦 Dependencies

| Package | Kegunaan |
|---|---|
| `@whiskeysockets/baileys` | Library WhatsApp Web API |
| `@hapi/boom` | HTTP error handling (dipakai Baileys) |
| `sharp` | Konversi dan resize gambar ke WebP |
| `fluent-ffmpeg` | Konversi video/GIF ke WebP animasi |
| `@ffmpeg-installer/ffmpeg` | Binary FFmpeg otomatis (PC/server) |
| `node-webpmux` | Inject metadata ke file WebP |
| `qrcode-terminal` | Tampilkan QR code di terminal |
| `fs-extra` | Utilitas file system |
| `pino` | Logger |

---

## 🛡️ Sistem Anti-Spam

Bot dilengkapi rate limit per pengirim (bukan per grup):

- **Cooldown** — harus menunggu 8 detik antara setiap request
- **Window limit** — maksimal 5 request per menit
- **Blacklist sementara** — jika melebihi limit, diblokir selama 5 menit

Bot akan membalas dengan pesan informasi berapa detik sisa waktu tunggu.

---

## 📁 Struktur Project

```
whatsapp-sticker-bot-baileys/
├── index.js        # File utama bot
├── package.json    # Konfigurasi project & dependencies
├── auth_info/      # Sesi login WhatsApp (di-generate otomatis)
├── temp/           # File sementara proses konversi (di-generate otomatis)
└── README.md       # Dokumentasi
```

---

## ⚠️ Catatan

- Bot ini menggunakan WhatsApp Web API unofficial. Gunakan dengan bijak.
- Stiker animasi di-compress otomatis agar tidak melebihi batas 500KB WhatsApp.
- Fitur teks pada stiker animasi membutuhkan FFmpeg dengan dukungan `libfreetype`. Binary dari `@ffmpeg-installer/ffmpeg` umumnya sudah mendukungnya.

---

## 📄 Lisensi

MIT
