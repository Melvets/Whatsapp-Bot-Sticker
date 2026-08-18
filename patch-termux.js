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

// Cek apakah sudah pernah di-patch sebelumnya
if (code.includes('// [TERMUX PATCH]')) {
  console.log('ℹ️  index.js sudah pernah di-patch sebelumnya. Tidak ada yang diubah.');
  process.exit(0);
}

// --- Patch 1: Hapus baris require('@ffmpeg-installer/ffmpeg') ---
// Catatan: buat regex baru setiap kali, jangan pakai flag /g dengan .test() + .replace()
const ffmpegInstallerLine = /^const\s+\w+\s*=\s*require\(['"]@ffmpeg-installer\/ffmpeg['"]\)[^;\n]*;?\s*\n/m;
if (ffmpegInstallerLine.test(code)) {
  code = code.replace(ffmpegInstallerLine, '');
  changed = true;
  console.log('✅ Patch 1: Hapus baris require @ffmpeg-installer/ffmpeg');
}

// --- Patch 2: Hapus baris ffmpeg.setFfmpegPath yang memakai variabel installer ---
// Contoh: ffmpeg.setFfmpegPath(ffmpegPath); atau ffmpeg.setFfmpegPath(ffmpegInstaller.path);
const setPathFromInstallerLine = /^ffmpeg\.setFfmpegPath\([^)]+\);?\s*\n/m;
if (setPathFromInstallerLine.test(code)) {
  code = code.replace(setPathFromInstallerLine, '');
  changed = true;
  console.log('✅ Patch 2: Hapus baris setFfmpegPath dari installer');
}

// --- Patch 3: Tambahkan setFfmpegPath ke system ffmpeg setelah require fluent-ffmpeg ---
const fluentRequirePattern = /(const\s+\w+\s*=\s*require\(['"]fluent-ffmpeg['"]\);)/;
if (fluentRequirePattern.test(code)) {
  code = code.replace(
    fluentRequirePattern,
    `$1
// [TERMUX PATCH] Gunakan system ffmpeg (install via: pkg install ffmpeg)
{
  const _cp = require('child_process');
  const _ffmpegModule = require('fluent-ffmpeg');
  const _ffmpegCmd = _cp.execSync('which ffmpeg 2>/dev/null || echo ffmpeg').toString().trim();
  _ffmpegModule.setFfmpegPath(_ffmpegCmd);
  _ffmpegModule.setFfprobePath('ffprobe');
}`
  );
  changed = true;
  console.log('✅ Patch 3: Tambah setFfmpegPath ke system ffmpeg');
}

// --- Fallback: jika pola utama tidak match, coba inject setelah baris require terakhir ---
if (!changed) {
  console.log('⚠️  Pola otomatis tidak ditemukan. Mencoba inject manual...');

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
} catch (e) { console.warn('Termux ffmpeg patch skipped:', e.message); }
`;
    code = code.slice(0, lineEnd) + injection + code.slice(lineEnd);
    changed = true;
    console.log('✅ Patch manual berhasil diinjeksikan.');
  } else {
    console.warn('⚠️  Tidak bisa menemukan lokasi inject. Patch dilewati.');
    console.warn('   Ubah baris:  ffmpeg.setFfmpegPath(ffmpegPath)');
    console.warn("   Jadi       :  ffmpeg.setFfmpegPath('ffmpeg')");
  }
}

// --- Backup & Save ---
if (changed) {
  fs.copyFileSync(indexPath, indexPath + '.backup');
  fs.writeFileSync(indexPath, code, 'utf8');
  console.log('\n✅ index.js berhasil dipatch!');
  console.log('   Backup disimpan di: index.js.backup');
} else {
  console.log('\nℹ️  Tidak ada perubahan yang dilakukan pada index.js.');
}
