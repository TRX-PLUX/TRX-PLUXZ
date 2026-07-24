require('dotenv').config();

module.exports = {
    // ===== IDENTITAS BOT =====
    botName: process.env.BOT_NAME || 'TroxzyMD',
    ownerName: process.env.OWNER_NAME || 'Troxzy',
    ownerNumber: (process.env.OWNER_NUMBER || '62xxx').replace(/\D/g, ''),
    botNumber: (process.env.BOT_NUMBER || '').replace(/\D/g, ''),
    telegramOwner: process.env.TELEGRAM_OWNER || 't.me/SoloBanNoTrash',
    // Link channel WhatsApp owner. WAJIB diisi manual sebelum deploy —
    // ganti dengan link channel asli, format: https://whatsapp.com/channel/xxxxx
    channelLink: process.env.CHANNEL_LINK || 'https://whatsapp.com/channel/0029Vb8IEPU4IBh7dGCrXB1W',

    // ===== SESI =====
    sessionMethod: process.env.SESSION_METHOD || 'pairing', // 'pairing' | 'qr'
    // CATATAN: fitur custom pairing code branded (mis. "TROXZYMD") SENGAJA
    // dihapus. Baileys secara klien mengizinkan custom code asal persis 8
    // karakter, TAPI diuji langsung di device asli dan WhatsApp menolaknya
    // ("Gagal menautkan perangkat") secara konsisten. Karena linking device
    // adalah fungsi paling kritis (tanpa ini bot tidak bisa jalan sama sekali),
    // bot ini SELALU memakai kode acak standar bawaan WhatsApp — satu-satunya
    // metode yang terbukti bekerja.

    // ===== AI =====
    // Alias model mengikuti katalog resmi FreeTheAi (freetheai.xyz/models).
    // PENTING: alias di provider ini pakai format "prefix/nama-model", BUKAN
    // nama model polos seperti "gpt-4o-mini" — itu tidak akan ditemukan.
    ai: {
        baseUrl: process.env.AI_BASE_URL || 'https://api.freetheai.xyz/v1',
        apiKey: process.env.AI_API_KEY || '',
        model: process.env.AI_MODEL || 'glm/glm-5.2',
        // Model cadangan otomatis jika model utama kena glm_depleted/provider_unavailable.
        // Dipilih dari katalog non-vova: opc/deepseek-v4-flash-free (gratis, context besar,
        // dan tidak berbagi limiter dengan GLM jadi kemungkinan besar masih tersedia
        // saat GLM sedang habis kuota 5-jam-nya).
        fallbackModel: process.env.AI_FALLBACK_MODEL || 'opc/deepseek-v4-flash-free',
        // Model khusus untuk fitur tambahan (bisa dioverride lewat .env jika alias berubah)
        ttsModel: process.env.AI_TTS_MODEL || 'mim/mimo-v2.5-tts',
        ttsFallbackModel: process.env.AI_TTS_FALLBACK_MODEL || 'mim/mimo-v2.5-tts',
        sttModel: process.env.AI_STT_MODEL || 'mim/mimo-v2.5-asr',
        sttFallbackModel: process.env.AI_STT_FALLBACK_MODEL || 'mim/mimo-v2.5-asr',
        imageModel: process.env.AI_IMAGE_MODEL || 'eve/gpt-image-2',
        // GLM-5.2 TIDAK memiliki kapabilitas vision (text-in/text-out saja).
        // Untuk fitur .analisagambar, dipakai model terpisah yang mendukung vision.
        //
        // CATATAN PENTING SOAL PILIHAN MODEL VISION:
        // Berdasarkan katalog FreeTheAi per awal Juli 2026, TIDAK ADA model
        // non-"vova/" yang eksplisit ditandai mendukung vision/image_url di
        // dokumentasi publik mereka. Prefix "vova/" khusus dipertahankan di
        // sini HANYA untuk fitur vision (analisa gambar) karena belum ada
        // alternatif yang terkonfirmasi mendukung format image_url — BUKAN
        // untuk fitur chat/teks utama (yang sudah dipindah ke glm/glm-5.2).
        // Owner: cek https://freetheai.xyz/models secara berkala; begitu ada
        // alias non-vova yang mendukung vision, ganti AI_VISION_MODEL di .env.
        // Jika ingin menghindari vova sepenuhnya, set AI_VISION_MODEL=disabled
        // di .env untuk mematikan fitur .analisagambar sampai ada alternatif.
        visionModel: process.env.AI_VISION_MODEL || 'vova/gemini-2.5-flash',
    },

    // ===== PAYMENT (MANUAL - QR statis) =====
    payment: {
        merchantName: process.env.QRIS_MERCHANT_NAME || 'Troxzy Store',
        qrisPath: './assets/qris.jpg',
    },

    // ===== PAYMENT (OTOMATIS - Midtrans SNAP API) =====
    // Isi ini SETELAH kamu daftar akun Midtrans (https://midtrans.com, cukup
    // KTP). Selama serverKey masih placeholder, sistem otomatis fallback ke
    // pembayaran manual (QR statis + approve owner) seperti sebelumnya —
    // TIDAK ada downtime atau bug kalau kamu belum sempat setup ini.
    midtrans: {
        serverKey: process.env.MIDTRANS_SERVER_KEY || '',
        clientKey: process.env.MIDTRANS_CLIENT_KEY || '',
        isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true', // default sandbox (aman untuk testing)
    },

    // ===== SERVER =====
    port: process.env.PORT || 2007,

    // ===== MODE =====
    publicMode: process.env.PUBLIC_MODE !== 'false',

    // ===== PREFIX =====
    prefix: ['.', '!', '#', '/'],

    // ===== LIMIT DEFAULT (fitur gratis vs premium) =====
    limit: {
        freeDaily: 25,       // limit harian user gratis
        premiumDaily: 500,   // limit harian user premium
    },

    // ===== HARGA PREMIUM (contoh, silakan diubah) =====
    premiumPrices: {
        '7hari': 5000,
        '30hari': 15000,
        '90hari': 35000,
        'lifetime': 100000,
    },

    // ===== TOGGLE FITUR GLOBAL (bisa diubah owner via command) =====
    features: {
        aiChat: true,
        downloader: true,
        sticker: true,
        antiSpam: true,
        antiLink: true,
        welcomeGoodbye: true,
        autoRead: false,
        autoTyping: false,
        selfMode: false, // kalau true, bot hanya respon ke owner
        smartReply: true, // aktifkan AI Chat natural di DM saat .aichat on
    },

    // ===== ANTI REPORT / ANTI RESTRICTION =====
    anti: {
        reportProtection: true,
        repeatedMessagesThreshold: 2,
        repeatedMessagesWindowMs: 120000,
        maxRecipientMessagesPerMinute: 10,
        maxDistinctRecipientsPerMinute: 25,
        extraDelayMs: 1200,
        highRiskRecipientDelayMs: 3000,
    },

    // ===== WARNA TEMA TOGGLE (untuk tampilan menu) =====
    theme: {
        on: '『 🟢 』',
        off: '『 🔴 』',
    }
};
