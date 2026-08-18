const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  downloadMediaMessage,
  Browsers,
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs-extra');
const path = require('path');
const webpmux = require('node-webpmux');
const readline = require('readline');

// ==== HELPER INPUT DARI TERMINAL ====
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (text) => new Promise((resolve) => rl.question(text, resolve));

ffmpeg.setFfmpegPath(
  (() => {
    try {
      // Termux / sistem: cari ffmpeg di PATH
      return require('child_process').execSync('which ffmpeg 2>/dev/null || where ffmpeg 2>nul').toString().trim().split('\n')[0].trim();
    } catch {
      // PC Windows fallback: pakai @ffmpeg-installer jika ada
      try { return require('@ffmpeg-installer/ffmpeg').path; } catch { return 'ffmpeg'; }
    }
  })()
);

// ==== KONFIGURASI ====
const CONFIG = {
  prefix: '/stiker',
  stickerAuthor: 'AMENG KANG STIKER',
  stickerName: 'MALING YH KMU',
  maxVideoDurationSec: 10,
  authFolder: path.join(__dirname, 'auth_info'),
  tempFolder: path.join(__dirname, 'temp'),

  // ==== LOGIN ====
  // true  -> login pakai nomor telepon (pairing code, tanpa scan QR)
  // false -> login pakai scan QR code (default lama)
  usePairingCode: true,
  // Isi nomor WhatsApp di sini pakai kode negara, TANPA + / spasi / strip.
  // Contoh Indonesia: '6281234567890'
  // Kalau dikosongkan (''), bot akan tanya nomornya lewat terminal saat start.
  phoneNumber: '',
};

fs.ensureDirSync(CONFIG.tempFolder);
fs.ensureDirSync(CONFIG.authFolder);

// ==== KONFIGURASI RATE LIMIT ====
const RATE_LIMIT = {
  cooldownMs: 8000,
  maxRequestsPerWindow: 5,
  windowMs: 60000,
  blacklistMs: 5 * 60000,
};
const userActivity = new Map();

function checkRateLimit(userId) {
  const now = Date.now();
  let data = userActivity.get(userId);
  if (!data) {
    data = { lastRequest: 0, requestTimestamps: [], blacklistedUntil: 0 };
    userActivity.set(userId, data);
  }

  if (data.blacklistedUntil > now) {
    return { allowed: false, reason: 'blacklisted', sisaDetik: Math.ceil((data.blacklistedUntil - now) / 1000) };
  }
  if (now - data.lastRequest < RATE_LIMIT.cooldownMs) {
    return { allowed: false, reason: 'cooldown', sisaDetik: Math.ceil((RATE_LIMIT.cooldownMs - (now - data.lastRequest)) / 1000) };
  }
  data.requestTimestamps = data.requestTimestamps.filter(t => now - t < RATE_LIMIT.windowMs);
  if (data.requestTimestamps.length >= RATE_LIMIT.maxRequestsPerWindow) {
    data.blacklistedUntil = now + RATE_LIMIT.blacklistMs;
    return { allowed: false, reason: 'too_many', sisaDetik: Math.ceil(RATE_LIMIT.blacklistMs / 1000) };
  }
  data.lastRequest = now;
  data.requestTimestamps.push(now);
  return { allowed: true };
}

// ==== HELPER: escape teks untuk FFmpeg drawtext ====
function escapeFF(s) {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/:/g, '\\:')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]');
}

// ==== HELPER: build drawtext filter untuk teks atas dan bawah ====
function buildDrawtextFilter(topText, bottomText, extraFilters) {
  const parts = extraFilters ? [extraFilters] : [];
  if (topText) {
    parts.push(
      `drawtext=text='${escapeFF(topText.toUpperCase())}':fontcolor=white:fontsize=48:borderw=3:bordercolor=black:x=(w-text_w)/2:y=20:font=serif`
    );
  }
  if (bottomText) {
    parts.push(
      `drawtext=text='${escapeFF(bottomText.toUpperCase())}':fontcolor=white:fontsize=48:borderw=3:bordercolor=black:x=(w-text_w)/2:y=h-text_h-20:font=serif`
    );
  }
  return parts.join(',');
}

// ==== KONVERSI GAMBAR KE WEBP (STIKER STATIS) + TEKS OPSIONAL ====
async function imageToWebpSticker(buffer, topText, bottomText) {
  const size = 512;
  const tmpIn = path.join(CONFIG.tempFolder, `img_in_${Date.now()}`);
  const tmpWebp = path.join(CONFIG.tempFolder, `img_out_${Date.now()}.webp`);

  await fs.writeFile(tmpIn, buffer);

  const baseFilter = `scale=${size}:${size}:force_original_aspect_ratio=decrease,pad=${size}:${size}:-1:-1:color=black@0.0`;
  const vf = buildDrawtextFilter(topText, bottomText, baseFilter);

  await new Promise((resolve, reject) => {
    ffmpeg(tmpIn)
      .outputOptions(['-vcodec', 'libwebp', '-vf', vf, '-quality', '80'])
      .toFormat('webp').save(tmpWebp)
      .on('end', resolve).on('error', reject);
  });

  const result = await fs.readFile(tmpWebp);
  await fs.remove(tmpIn).catch(() => {});
  await fs.remove(tmpWebp).catch(() => {});
  return result;
}

// ==== KONVERSI VIDEO/GIF KE WEBP ANIMASI + TEKS OPSIONAL ====
async function videoToWebpSticker(buffer, topText, bottomText) {
  const inputPath = path.join(CONFIG.tempFolder, `in_${Date.now()}`);
  const outputPath = path.join(CONFIG.tempFolder, `out_${Date.now()}.webp`);

  await fs.writeFile(inputPath, buffer);

  function buildVideoFilter(fps) {
    const base = `scale=512:512:force_original_aspect_ratio=decrease,fps=${fps},pad=512:512:-1:-1:color=white@0.0`;
    return buildDrawtextFilter(topText, bottomText, base);
  }

  async function runFfmpeg(fps, quality, duration) {
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .duration(duration)
        .outputOptions([
          '-vcodec', 'libwebp',
          '-vf', buildVideoFilter(fps),
          '-loop', '0', '-preset', 'picture', '-an', '-vsync', '0',
          '-quality', `${quality}`, '-compression_level', '6',
        ])
        .toFormat('webp').save(outputPath)
        .on('end', resolve).on('error', reject);
    });
    const stat = await fs.stat(outputPath);
    return stat.size;
  }

  const attempts = [
    { fps: 12, quality: 60, duration: Math.min(CONFIG.maxVideoDurationSec, 6) },
    { fps: 10, quality: 45, duration: 5 },
    { fps: 8,  quality: 35, duration: 4 },
    { fps: 6,  quality: 25, duration: 3 },
  ];

  const maxSizeBytes = 500 * 1024;
  let finalSize = Infinity;

  for (const attempt of attempts) {
    finalSize = await runFfmpeg(attempt.fps, attempt.quality, attempt.duration);
    if (finalSize <= maxSizeBytes) break;
  }

  const outputBuffer = await fs.readFile(outputPath);
  await fs.remove(inputPath).catch(() => {});
  await fs.remove(outputPath).catch(() => {});

  if (finalSize > maxSizeBytes) {
    console.warn(`⚠️ Stiker ${(finalSize / 1024).toFixed(0)}KB, batasnya 500KB loh ya cik 😹`);
  }

  return outputBuffer;
}

// ==== TAMBAHKAN METADATA AUTHOR & PACK NAME KE WEBP ====
async function addStickerMetadata(webpBuffer, packName, authorName) {
  const img = new webpmux.Image();
  await img.load(webpBuffer);

  const json = {
    'sticker-pack-id': 'com.botstiker.wa',
    'sticker-pack-name': packName,
    'sticker-pack-publisher': authorName,
    emojis: ['😀'],
  };

  const exifAttr = Buffer.from([
    0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57,
    0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
  ]);
  const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf-8');
  exifAttr.writeUIntLE(jsonBuffer.length, 14, 4);
  const exif = Buffer.concat([exifAttr, jsonBuffer]);

  img.exif = exif;
  return await img.save(null);
}

// ==== PARSING CAPTION: PISAHKAN PREFIX & TEKS MEME ====
function parseCaption(caption) {
  const trimmed = caption.trim();
  const lower = trimmed.toLowerCase();

  if (!lower.startsWith(CONFIG.prefix)) return null;

  const rest = trimmed.slice(CONFIG.prefix.length).trim();
  if (!rest) return { topText: '', bottomText: '' };

  const parts = rest.split('|').map((s) => s.trim());
  return { topText: parts[0] || '', bottomText: parts[1] || '' };
}

// ==== START BOT ====
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(CONFIG.authFolder);

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    // Kalau pakai pairing code, QR di terminal dimatikan (gak kepake)
    printQRInTerminal: !CONFIG.usePairingCode,
    browser: Browsers.ubuntu('Chrome'),
  });

  // ==== LOGIN PAKAI NOMOR TELEPON (PAIRING CODE) ====
  // Cuma jalan kalau belum pernah login sebelumnya (belum ada sesi tersimpan)
  // Flag ini mencegah requestPairingCode dipanggil lebih dari satu kali
  // meskipun startBot() dipanggil berulang saat reconnect
  let pairingCodeRequested = false;

  if (CONFIG.usePairingCode && !sock.authState.creds.registered) {
    let nomor = CONFIG.phoneNumber?.trim();
    if (!nomor) {
      nomor = await question('📱 Masukkan nomor WhatsApp bot (contoh: 6281234567890): ');
      nomor = nomor.trim();
    }
    nomor = nomor.replace(/[^0-9]/g, '');

    // Request pairing code — dipanggil sekali saat event pertama masuk,
    // flag mencegah duplikasi saat reconnect
    sock.ev.on('connection.update', async (update) => {
      if (!pairingCodeRequested && !sock.authState.creds.registered) {
        pairingCodeRequested = true;
        try {
          const kodePairing = await sock.requestPairingCode(nomor);
          console.log('🔗 Kode Pairing kamu: ' + kodePairing);
          console.log('Buka WhatsApp di HP -> Perangkat Tertaut -> Tautkan dengan nomor telepon -> masukkan kode di atas.');
        } catch (err) {
          pairingCodeRequested = false;
          console.error('❌ Gagal minta kode pairing:', err.message);
        }
      }
    });
  }

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect =
        new Boom(lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Koneksi terputus. Reconnect:', shouldReconnect);
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log('✅ Bot dah siap boss!');
    }
  });

  // Set untuk track message ID yang sudah diproses, cegah duplikat
  const processedMsgIds = new Set();

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    // Hanya proses pesan baru, bukan history sync
    if (type !== 'notify') return;

    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    // Cegah pesan yang sama diproses dua kali (kadang Baileys kirim duplikat)
    const msgId = msg.key.id;
    if (processedMsgIds.has(msgId)) return;
    processedMsgIds.add(msgId);
    // Bersihkan set setelah 5 menit agar tidak makan memori
    setTimeout(() => processedMsgIds.delete(msgId), 5 * 60 * 1000);

    try {
      const jid = msg.key.remoteJid;
      const senderId = msg.key.participant || jid;

      const messageType = Object.keys(msg.message)[0];
      const caption =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        msg.message.videoMessage?.caption ||
        '';

      const parsed = parseCaption(caption);
      if (!parsed) return; 

      // ==== CEK RATE LIMIT (per pengirim, bukan per chat) ====
      const rl = checkRateLimit(senderId);
      if (!rl.allowed) {
        const pesanMap = {
          blacklisted: `⛔ Makanya jangan spam, keblokir kan 😹. Tunggu ${rl.sisaDetik} detik`,
          cooldown: `⏳ Sabar masih ${rl.sisaDetik} detik lagi`,
          too_many: `🚫 Sabar, satu-satu woi lahh. Kamu di-blokir, tunggu ${rl.sisaDetik} detik`,
        };
        await sock.sendMessage(jid, { text: pesanMap[rl.reason] });
        return;
      }

      // Cari media: di pesan ini atau di pesan yang di-quote/reply
      let mediaMsg = msg;
      let hasMedia = messageType === 'imageMessage' || messageType === 'videoMessage';

      const contextInfo =
        msg.message.extendedTextMessage?.contextInfo || msg.message[messageType]?.contextInfo;

      if (!hasMedia && contextInfo?.quotedMessage) {
        const quotedType = Object.keys(contextInfo.quotedMessage)[0];
        if (quotedType === 'imageMessage' || quotedType === 'videoMessage') {
          hasMedia = true;
          mediaMsg = {
            key: {
              remoteJid: jid,
              id: contextInfo.stanzaId,
              fromMe: false,
              participant: contextInfo.participant,
            },
            message: contextInfo.quotedMessage,
          };
        }
      }

      if (!hasMedia) {
        await sock.sendMessage(jid, {
          text:
            'Halo, gweh asistennya ameng 😋\n\n' +
            'Kalo mau bikin stiker: \n1. Kirim gambar/video/GIF atau reply pake capt */stiker*\n' +
            '2. */stiker <teks atas> | <teks bawah>* kalo mau nambah teksnya'
        });
        return;
      }

      await sock.sendMessage(jid, { text: '⏳ Sabar, lagi dibuat nih 😋' });

      const buffer = await downloadMediaMessage(mediaMsg, 'buffer', {});
      const mType = Object.keys(mediaMsg.message)[0];

      let webpBuffer;
      if (mType === 'videoMessage') {
        webpBuffer = await videoToWebpSticker(buffer, parsed.topText, parsed.bottomText);
      } else {
        webpBuffer = await imageToWebpSticker(buffer, parsed.topText, parsed.bottomText);
      }

      webpBuffer = await addStickerMetadata(webpBuffer, CONFIG.stickerName, CONFIG.stickerAuthor);

      await sock.sendMessage(jid, { sticker: webpBuffer });
    } catch (err) {
      console.error('Error saat memproses pesan:', err);
      try {
        await sock.sendMessage(msg.key.remoteJid, { text: '❌ Wah gagal, coba pake file lain yah 🤫' });
      } catch (_) {}
    }
  });
}

startBot();