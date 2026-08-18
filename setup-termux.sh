#!/data/data/com.termux/files/usr/bin/bash

# ============================================================
#   SETUP SCRIPT - WhatsApp Sticker Bot untuk Termux Android
#   Repo: https://github.com/Melvets/Whatsapp-Bot-Sticker
# ============================================================

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   WA Sticker Bot - Setup Termux Android  ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# --- 1. Update & install dependensi sistem ---
echo "[1/5] Update package & install dependensi sistem..."
pkg update -y && pkg upgrade -y
pkg install -y nodejs git ffmpeg python make clang

# Verifikasi ffmpeg
if ! command -v ffmpeg &> /dev/null; then
  echo "ERROR: ffmpeg gagal terinstall. Coba jalankan: pkg install ffmpeg"
  exit 1
fi
echo "✅ ffmpeg: $(ffmpeg -version 2>&1 | head -n1)"

# --- 2. Clone repo ---
echo ""
echo "[2/5] Clone repository..."
if [ -d "Whatsapp-Bot-Sticker" ]; then
  echo "Folder sudah ada, skip clone."
  cd Whatsapp-Bot-Sticker
else
  git clone https://github.com/Melvets/Whatsapp-Bot-Sticker.git
  cd Whatsapp-Bot-Sticker
fi

# --- 3. Patch package.json (hapus @ffmpeg-installer) ---
echo ""
echo "[3/5] Patch package.json untuk Termux..."
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
delete pkg.dependencies['@ffmpeg-installer/ffmpeg'];
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log('✅ package.json berhasil dipatch');
"

# --- 4. Install npm dependencies ---
echo ""
echo "[4/5] Install npm dependencies..."
# Atur env agar sharp bisa dikompilasi
export npm_config_build_from_source=true
npm install

# --- 5. Patch index.js (ganti ffmpeg path) ---
echo ""
echo "[5/5] Patch index.js: ganti @ffmpeg-installer ke system ffmpeg..."
node patch-termux.js

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   ✅ Setup selesai!                       ║"
echo "║                                           ║"
echo "║   Jalankan bot dengan:                    ║"
echo "║   bash start-termux.sh                    ║"
echo "║                                           ║"
echo "║   Atau langsung: node index.js            ║"
echo "╚══════════════════════════════════════════╝"
echo ""
