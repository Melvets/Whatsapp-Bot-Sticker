# 📱 WhatsApp Sticker Bot - Panduan Termux Android

Panduan ini membantu kamu menjalankan [Whatsapp-Bot-Sticker](https://github.com/Melvets/Whatsapp-Bot-Sticker) 
di HP Android menggunakan **Termux**.

---

## ⚠️ Masalah Original di Android & Solusinya

| Masalah | Penyebab | Solusi |
|---|---|---|
| `@ffmpeg-installer/ffmpeg` error | Binary x86/x64, tidak jalan di ARM Android | Pakai `ffmpeg` dari `pkg install ffmpeg` |
| `sharp` gagal install | Butuh kompilasi native | Tambahkan `clang` + `make` lalu build from source |
| Bot mati saat layar off | Android Doze mode | Pakai `nohup` atau `pm2` + nonaktifkan optimasi baterai |

---

## 🚀 Cara Install (Otomatis)

### Langkah 1 — Install Termux
Download Termux dari **F-Droid** (bukan Play Store, versi Play Store outdated):
> https://f-droid.org/packages/com.termux/

### Langkah 2 — Copy file ke Termux
Salin 3 file ini ke folder yang sama di Termux:
- `setup-termux.sh`
- `patch-termux.js`  
- `start-termux.sh`

Atau langsung download dari link jika tersedia.

### Langkah 3 — Jalankan setup otomatis

```bash
bash setup-termux.sh
```

Script ini akan:
1. Update package Termux
2. Install Node.js, git, ffmpeg, python, clang
3. Clone repo dari GitHub
4. Patch `package.json` (hapus `@ffmpeg-installer/ffmpeg`)
5. Install npm dependencies
6. Patch `index.js` (ganti ffmpeg path ke sistem)

---

## 🚀 Cara Install (Manual, step by step)

```bash
# 1. Update Termux
pkg update && pkg upgrade -y

# 2. Install dependensi sistem
pkg install nodejs git ffmpeg python make clang -y

# 3. Clone repo
git clone https://github.com/Melvets/Whatsapp-Bot-Sticker.git
cd Whatsapp-Bot-Sticker

# 4. Hapus @ffmpeg-installer dari package.json
# Edit package.json, hapus baris: "@ffmpeg-installer/ffmpeg": "^1.1.0"

# 5. Install npm dependencies
npm install

# 6. Jalankan patch script
node patch-termux.js

# 7. Jalankan bot
node index.js
```

---

## ▶️ Cara Menjalankan Bot

### Pertama kali (Scan QR)
Jalankan foreground agar bisa scan QR code:
```bash
node index.js
```
Setelah QR muncul, scan lewat WhatsApp → **Perangkat Tertaut** → **Tautkan Perangkat**.
Sesi akan tersimpan otomatis di folder `auth_info/`.

### Selanjutnya (Background)
Setelah sesi tersimpan, bisa jalan di background:
```bash
bash start-termux.sh
# Pilih [2] untuk nohup atau [3] untuk pm2
```

---

## 💡 Tips Agar Bot Tidak Mati

### 1. Nonaktifkan Optimasi Baterai untuk Termux
Pengaturan HP → Baterai → Optimasi Baterai → Cari Termux → Jangan Optimalkan

### 2. Gunakan Termux:Boot (opsional)
Install **Termux:Boot** dari F-Droid agar bot otomatis start saat HP restart.

Buat file autostart:
```bash
mkdir -p ~/.termux/boot
cat > ~/.termux/boot/start-bot.sh << 'EOF'
#!/data/data/com.termux/files/usr/bin/bash
cd ~/Whatsapp-Bot-Sticker
nohup node index.js > bot.log 2>&1 &
EOF
chmod +x ~/.termux/boot/start-bot.sh
```

### 3. Aktifkan Wake Lock
Jalankan perintah ini sebelum bot:
```bash
termux-wake-lock
```
(Memerlukan Termux:API dari F-Droid)

---

## 🐛 Troubleshooting

### Error: `sharp` gagal install
```bash
npm_config_build_from_source=true npm install sharp
```

### Error: `ffmpeg not found`
```bash
pkg install ffmpeg
which ffmpeg  # Pastikan output: /data/data/com.termux/files/usr/bin/ffmpeg
```

### Bot error setelah patch
Restore backup:
```bash
cp index.js.backup index.js
node index.js
```

### QR tidak muncul / session corrupt
```bash
rm -rf auth_info/
node index.js
```

---

## 📁 Struktur File Setelah Setup

```
Whatsapp-Bot-Sticker/
├── index.js            ← Sudah dipatch oleh patch-termux.js
├── index.js.backup     ← Backup index.js original
├── package.json        ← @ffmpeg-installer sudah dihapus
├── patch-termux.js     ← Script patch (sudah dijalankan)
├── setup-termux.sh     ← Script setup
├── start-termux.sh     ← Script launcher
├── auth_info/          ← Sesi WhatsApp (auto-generated)
├── temp/               ← File sementara (auto-generated)
└── bot.log             ← Log bot (jika pakai nohup)
```

---

## 📊 Perbandingan Mode Jalankan

| Mode | Perintah | Kelebihan | Kekurangan |
|---|---|---|---|
| Foreground | `node index.js` | Lihat QR langsung | Bot mati jika terminal ditutup |
| nohup | `nohup node index.js &` | Mudah, built-in | Log perlu dicek manual |
| pm2 | `pm2 start index.js` | Auto-restart, log bagus | Perlu install pm2 |

---

*Dibuat untuk kompatibilitas Termux Android ARM64*
