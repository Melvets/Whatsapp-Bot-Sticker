#!/data/data/com.termux/files/usr/bin/bash

# ============================================================
#   START SCRIPT - WhatsApp Sticker Bot untuk Termux
# ============================================================

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   WA Sticker Bot - Termux Launcher       ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# Cek apakah index.js ada
if [ ! -f "index.js" ]; then
  echo "❌ index.js tidak ditemukan!"
  echo "   Pastikan kamu berada di folder Whatsapp-Bot-Sticker."
  exit 1
fi

# Cek apakah node_modules ada
if [ ! -d "node_modules" ]; then
  echo "❌ node_modules tidak ditemukan!"
  echo "   Jalankan setup dulu: bash setup-termux.sh"
  exit 1
fi

# Cek ffmpeg
if ! command -v ffmpeg &> /dev/null; then
  echo "❌ ffmpeg tidak ditemukan!"
  echo "   Install dengan: pkg install ffmpeg"
  exit 1
fi

echo "Pilih mode jalankan:"
echo "  [1] Foreground (di terminal, CTRL+C untuk stop)"
echo "  [2] Background dengan nohup (bot tetap jalan saat terminal ditutup)"
echo "  [3] Background dengan pm2 (perlu npm install -g pm2)"
echo ""
read -p "Pilihan [1/2/3]: " choice

case $choice in
  1)
    echo ""
    echo "▶ Menjalankan bot di foreground..."
    echo "   Tekan CTRL+C untuk menghentikan."
    echo ""
    node index.js
    ;;
  2)
    echo ""
    echo "▶ Menjalankan bot di background (nohup)..."
    nohup node index.js > bot.log 2>&1 &
    BOT_PID=$!
    echo "✅ Bot berjalan dengan PID: $BOT_PID"
    echo "   Log tersimpan di: bot.log"
    echo ""
    echo "   Perintah berguna:"
    echo "   - Lihat log  : tail -f bot.log"
    echo "   - Stop bot   : kill $BOT_PID"
    echo "   - Cek QR code: grep -A 5 'QR' bot.log"
    echo ""
    echo "⚠️  PENTING: Saat pertama scan QR, jalankan mode Foreground [1]"
    echo "   agar bisa scan QR di terminal. Setelah sesi tersimpan di auth_info/"
    echo "   baru gunakan background mode."
    ;;
  3)
    # Cek pm2
    if ! command -v pm2 &> /dev/null; then
      echo "pm2 belum terinstall. Install sekarang? (y/n)"
      read -p "" install_pm2
      if [ "$install_pm2" = "y" ]; then
        npm install -g pm2
      else
        echo "❌ pm2 tidak tersedia. Pilih mode lain."
        exit 1
      fi
    fi
    echo ""
    echo "▶ Menjalankan bot dengan pm2..."
    pm2 start index.js --name "wa-sticker-bot"
    pm2 save
    echo ""
    echo "✅ Bot berjalan via pm2."
    echo "   Perintah berguna:"
    echo "   - Lihat log  : pm2 logs wa-sticker-bot"
    echo "   - Stop bot   : pm2 stop wa-sticker-bot"
    echo "   - Restart    : pm2 restart wa-sticker-bot"
    echo "   - Status     : pm2 status"
    ;;
  *)
    echo "❌ Pilihan tidak valid."
    exit 1
    ;;
esac
