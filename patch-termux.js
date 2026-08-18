/**
 * patch-termux.js
 * Otomatis patch index.js agar bisa jalan di Termux Android.
 * Jalankan SATU KALI setelah clone repo:
 *   node patch-termux.js
 */

const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'index.js');

if (!fs.existsSync(indexPath)) {
  console.error('❌ index.js tidak ditemukan! Pastikan kamu sudah clone repo.');
  process.exit(1);
}

let code = fs.readFileSync(indexPath, 'utf8');
let changed = false;

// --- Patch 1: Hapus import @ffmpeg-installer/ffmpeg ---
// Pola: require('@ffmpeg-installer/ffmpeg')
const ffmpegInstallerPattern = /const\s+\w+\s*=\s*require\(['"]@ffmpeg-installer\/ffmpeg['"]\)[\s\S]*?;\s*\n/g;
if (ffmpegInstallerPattern.test(code)) {
  code = code.replace(ffmpegInstallerPattern, '');
  changed = true;
  console.log('✅ Patch 1: Hapus @ffmpeg-installer/ffmpeg import');
}

// --- Patch 2: Hapus baris setFfmpegPath yang pakai installer ---
// Pola: ffmpeg.setFfmpegPath(ffmpegInstaller.path) atau variasi
const setPathFromInstallerPattern = /fluent\w*\.setFfmpegPath\(\s*\w+\.path\s*\);?\s*\n/g;
if (setPathFromInstallerPattern.test(code)) {
  code = code.replace(setPathFromInstallerPattern, '');
  changed = true;
  console.log('✅ Patch 2: Hapus setFfmpegPath dari installer');
}

// --- Patch 3: Setelah require('fluent-ffmpeg'), tambah setFfmpegPath system ---
// Cari baris require fluent-ffmpeg
const fluentRequirePattern = /(const\s+\w+\s*=\s*require\(['"]fluent-ffmpeg['"]\);)/;
if (fluentRequirePattern.test(code)) {
  code = code.replace(
    fluentRequirePattern,
    `$1
// [TERMUX PATCH] Gunakan system ffmpeg (install via: pkg install ffmpeg)
{
  const _ffmpegCmd = require('child_process').execSync('which ffmpeg 2>/dev/null || echo ffmpeg').toString().trim();
  const _ffmpegModule = require('fluent-ffmpeg');
  _ffmpegModule.setFfmpegPath(_ffmpegCmd);
  _ffmpegModule.setFfprobePath('ffprobe');
}`
  );
  changed = true;
  console.log('✅ Patch 3: Tambah setFfmpegPath ke system ffmpeg');
}

// --- Patch 4: Fallback - cari semua pola .setFfmpegPath dan pastikan tidak pakai installer ---
// Jika pola di atas tidak match, coba pendekatan alternatif
const anySetFfmpegPath = /setFfmpegPath\(\s*['"]?(\w+\.path)['"]?\s*\)/g;
if (anySetFfmpegPath.test(code)) {
  code = code.replace(anySetFfmpegPath, "setFfmpegPath('ffmpeg')");
  changed = true;
  console.log('✅ Patch 4 (fallback): Ganti path ffmpeg ke sistem');
}

if (!changed) {
  // Cek apakah sudah di-patch sebelumnya
  if (code.includes('TERMUX PATCH')) {
    console.log('ℹ️  index.js sudah pernah di-patch sebelumnya. Tidak ada yang diubah.');
  } else {
    // Inject manual di awal file setelah semua require
    console.log('⚠️  Pola otomatis tidak ditemukan. Melakukan inject manual...');
    const lastRequireIdx = Math.max(
      code.lastIndexOf("require('@whiskeysockets/baileys')"),
      code.lastIndexOf("require('fluent-ffmpeg')"),
      code.lastIndexOf('require("fluent-ffmpeg")')
    );
    if (lastRequireIdx !== -1) {
      const lineEnd = code.indexOf('\n', lastRequireIdx) + 1;
      const injection = `
// [TERMUX PATCH] Set system ffmpeg path
try {
  const _cp = require('child_process');
  const _fm = require('fluent-ffmpeg');
  const _fp = _cp.execSync('which ffmpeg 2>/dev/null || echo ffmpeg').toString().trim();
  _fm.setFfmpegPath(_fp);
  _fm.setFfprobePath('ffprobe');
} catch(e) {}
`;
      code = code.slice(0, lineEnd) + injection + code.slice(lineEnd);
      changed = true;
      console.log('✅ Patch manual berhasil diinjeksikan.');
    } else {
      console.warn('⚠️  Tidak bisa menemukan lokasi inject. Patch dilewati.');
      console.warn('   Cari baris dengan @ffmpeg-installer di index.js dan ganti secara manual.');
      console.warn('   Ubah:  ffmpeg.setFfmpegPath(ffmpegInstaller.path)');
      console.warn("   Jadi:  ffmpeg.setFfmpegPath('ffmpeg')");
    }
  }
}

// --- Backup & Save ---
if (changed) {
  // Simpan backup
  fs.writeFileSync(indexPath + '.backup', fs.readFileSync(indexPath));
  // Tulis file yang sudah dipatch
  fs.writeFileSync(indexPath, code);
  console.log('\n✅ index.js berhasil dipatch!');
  console.log('   Backup disimpan di: index.js.backup');
} else {
  console.log('\nℹ️  Tidak ada perubahan yang dilakukan pada index.js.');
}
