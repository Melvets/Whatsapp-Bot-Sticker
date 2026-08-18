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

# Verifikasi node
if ! command -v node &> /dev/null; then
  echo "ERROR: nodejs gagal terinstall. Coba jalankan: pkg install nodejs"
  exit 1
fi
echo "✅ Node.js: $(node --version)"

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
  echo "Folder sudah ada, skip clone. Lakukan git pull..."
  cd Whatsapp-Bot-Sticker
  git pull
else
  git clone https://github.com/Melvets/Whatsapp-Bot-Sticker.git
  cd Whatsapp-Bot-Sticker
fi

# --- 3. Patch package.json (hapus @ffmpeg-installer, @hapi/boom sudah ada di Baileys) ---
echo ""
echo "[3/5] Patch package.json untuk Termux..."
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const removed = [];
// Hapus @ffmpeg-installer karena binary-nya x86/x64, tidak jalan di ARM Android
if (pkg.dependencies['@ffmpeg-installer/ffmpeg']) {
  delete pkg.dependencies['@ffmpeg-installer/ffmpeg'];
  removed.push('@ffmpeg-installer/ffmpeg');
}
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
if (removed.length > 0) {
  console.log('✅ package.json dipatch, dihapus: ' + removed.join(', '));
} else {
  console.log('ℹ️  package.json sudah bersih, tidak ada yang dihapus.');
}
"

# --- 4. Install npm dependencies ---
echo ""
echo "[4/5] Install npm dependencies..."
# Atur env agar sharp bisa dikompilasi dari source di ARM
export npm_config_build_from_source=true
npm install

if [ $? -ne 0 ]; then
  echo ""
  echo "❌ npm install gagal. Coba langkah berikut:"
  echo "   1. Pastikan koneksi internet stabil"
  echo "   2. Jalankan: npm install --legacy-peer-deps"
  exit 1
fi
echo "✅ Dependencies berhasil diinstall"

# --- 5. Patch index.js (ganti ffmpeg path ke sistem) ---
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
