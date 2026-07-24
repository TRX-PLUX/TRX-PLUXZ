const { Boom } = require('@hapi/boom');
const pino = require('pino');
const readline = require('readline');
const chalk = require('chalk');
const NodeCache = require('node-cache');
const qrcodeTerminal = require('qrcode-terminal');

const config = require('../config/config');
const banner = require('./banner');
const { loadPlugins } = require('./pluginLoader');
const { handleMessage } = require('./messageHandler');
const { isGroupAdmin, isBotGroupAdmin } = require('./groupUtils');
const { handleGroupParticipantsUpdate } = require('./groupEvents');
const { handleNonCommandMessage } = require('./nonCommandHandler');
const { wrapSockForAntiban, recordFirstConnectIfNeeded } = require('./antiban');
const { loadSchedules } = require('./scheduler');
const { loadReminders } = require('./reminder');
const { getEffectiveSessionMethod, resolvePairingNumber, shouldFallbackToQr } = require('./sessionUtils');

const logger = pino({ level: 'silent' });
const msgRetryCache = new NodeCache();

let rl = null;
function getReadline() {
    if (!rl) {
        rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    }
    return rl;
}
const question = (text) => new Promise((resolve) => {
    try {
        getReadline().question(text, resolve);
    } catch (err) {
        console.log(chalk.red('Gagal membaca input terminal. Pastikan menjalankan bot dari console interaktif Pterodactyl.'));
        resolve('');
    }
});

let sock;
let { commandMap, allPlugins } = loadPlugins();

// Baileys v7 adalah paket ESM murni ("type": "module"). Project ini tetap
// CommonJS (semua 54+ plugin pakai require/module.exports), jadi daripada
// migrasi total ke ESM, kita load Baileys lewat dynamic import() sesuai
// rekomendasi resmi Baileys sendiri untuk skenario "Import Baileys from
// within CommonJS": https://baileys.wiki/docs/migration/to-v7.0.0/
// baileysApi di-cache di module scope supaya cuma di-import() sekali.
let baileysApi = null;
async function getBaileys() {
    if (!baileysApi) {
        baileysApi = await import('@whiskeysockets/baileys');
    }
    return baileysApi;
}

/**
 * Memvalidasi format nomor WhatsApp untuk pairing. Dipisah jadi fungsi
 * sendiri supaya pesan errornya jelas dan mudah ditest terpisah.
 * Mengembalikan { valid: true, number } atau { valid: false, reason }.
 */
function validatePairingNumber(rawInput) {
    const cleanNumber = rawInput.replace(/\D/g, '');

    if (!cleanNumber) {
        return { valid: false, reason: 'Nomor tidak boleh kosong.' };
    }
    if (cleanNumber.length < 8 || cleanNumber.length > 15) {
        return {
            valid: false,
            reason: `Nomor "${cleanNumber}" (${cleanNumber.length} digit) tidak valid — nomor internasional biasanya 8-15 digit.`
        };
    }
    if (cleanNumber.startsWith('0')) {
        return {
            valid: false,
            reason: `Nomor "${cleanNumber}" masih pakai format lokal (awalan 0). Ganti awalan 0 dengan kode negara — contoh Indonesia: 08123456789 → 628123456789.`
        };
    }

    return { valid: true, number: cleanNumber };
}

async function startBot() {
    banner.printBanner();

    const {
        default: makeWASocket,
        useMultiFileAuthState,
        DisconnectReason,
        fetchLatestBaileysVersion,
        makeCacheableSignalKeyStore,
        Browsers,
    } = await getBaileys();

    const effectiveSessionMethod = getEffectiveSessionMethod(config.sessionMethod);
    const { state, saveCreds } = await useMultiFileAuthState('./sessions');
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
        version,
        logger,
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        msgRetryCounterCache: msgRetryCache,
        browser: Browsers.macOS('Desktop'),
        generateHighQualityLinkPreview: true,
        syncFullHistory: false,
        markOnlineOnConnect: true,
    });

    // Bungkus sock.sendMessage supaya SEMUA pesan keluar (dari command apa pun,
    // di plugin mana pun) otomatis kena delay natural + typing indicator.
    // Lihat lib/antiban.js untuk detail dan alasan teknisnya.
    wrapSockForAntiban(sock);

    // ===== STATE UNTUK PAIRING CODE FLOW =====
    let sessionMethod = effectiveSessionMethod;
    // PENTING — BUG YANG DIPERBAIKI DI SINI:
    // Sebelumnya, kode melakukan "await question(...)" (menunggu input user)
    // SEBELUM listener 'connection.update' didaftarkan. Ini menyebabkan race
    // condition: jika event 'connection.update' pertama (status "connecting")
    // keluar duluan SEBELUM user selesai mengetik nomor, listener yang baru
    // didaftarkan setelahnya TIDAK AKAN PERNAH menangkap event tersebut —
    // membuat proses "menggantung" tanpa pairing code maupun error, tergantung
    // seberapa cepat user mengetik relatif terhadap kecepatan koneksi ke
    // WhatsApp saat itu. Inilah kemungkinan besar penyebab "kadang error,
    // kadang tidak" yang dilaporkan.
    //
    // PERBAIKAN: listener 'connection.update' didaftarkan SEGERA (di bawah),
    // sebelum "await question(...)" dipanggil. Nomor telepon disimpan di
    // variabel yang di-assign belakangan (setelah user menjawab), dan listener
    // mengecek variabel itu setiap kali event masuk — jadi urutan mana pun
    // yang terjadi lebih dulu (nomor siap duluan, atau status connecting
    // duluan), keduanya tetap akan bertemu dengan benar.
    let pairingCodeRequested = false;
    let cleanNumber = null;
    let pairingNumberReady = false;

    async function tryRequestPairingCode(connectionStatus, qr) {
        if (sessionMethod !== 'pairing') return;
        if (!pairingNumberReady || !cleanNumber) return;
        if (pairingCodeRequested) return;
        if (sock.authState.creds.registered) return;
        if (connectionStatus !== 'connecting' && !qr) return;

        pairingCodeRequested = true;

        // ===== CUSTOM PAIRING CODE DIHAPUS =====
        // Sebelumnya kode ini mencoba custom pairing code branded (mis. "TROXZYMD")
        // via requestPairingCode(number, customCode). Secara KLIEN itu valid
        // (Baileys mengizinkan asal persis 8 karakter), TAPI terbukti gagal di
        // pengujian nyata: WhatsApp merespons "Gagal menautkan perangkat" secara
        // konsisten meski kode tampil benar di layar dan dimasukkan dengan benar.
        // Baileys mengizinkan mengirim custom code (validasi di sisi KLIEN) —
        // itu tidak sama dengan WhatsApp menerimanya (validasi di sisi SERVER,
        // yang ternyata menolak). Karena linking device adalah fungsi paling
        // kritis di seluruh bot (tanpa ini bot tidak bisa jalan sama sekali),
        // sekarang SELALU pakai kode acak standar bawaan WhatsApp — satu-satunya
        // metode yang terbukti bekerja secara konsisten.
        try {
            const code = await sock.requestPairingCode(cleanNumber);
            const formattedCode = code.match(/.{1,4}/g)?.join('-') || code;
            console.log(chalk.greenBright(`\n🔑 Kode Pairing kamu: `) + chalk.yellowBright.bold(formattedCode));
            console.log(chalk.gray('Buka WhatsApp > Perangkat Tertaut > Tautkan dengan nomor telepon, lalu masukkan kode di atas.'));
            console.log(chalk.yellow('⚠️  Kode ini berlaku HANYA SEKITAR 60 DETIK — segera buka WhatsApp dan masukkan kode SEBELUM habis waktu. Jangan menunda.'));
            console.log(chalk.gray('Jika kode kedaluwarsa atau gagal, restart bot untuk minta kode baru.\n'));
        } catch (err) {
            console.log(chalk.red('\n❌ Gagal meminta pairing code.'));
            console.log(chalk.red(`   Detail: ${err.message}`));
            console.log(chalk.yellow('   Ini biasanya berarti pairing tidak diterima oleh WhatsApp, jadi bot akan beralih ke mode QR sebagai fallback.'));
            pairingCodeRequested = false;
            sessionMethod = 'qr';
            console.log(chalk.cyanBright('🔄 Beralih ke mode QR untuk login yang lebih stabil.'));
        }
    }

    // ===== CONNECTION UPDATE (didaftarkan SEGERA, sebelum menunggu input user) =====
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        // v7 menghapus opsi printQRInTerminal bawaan, jadi QR di-render manual di sini
        if (qr && sessionMethod === 'qr') {
            console.log(chalk.yellow('\nScan QR code berikut dengan WhatsApp > Perangkat Tertaut:\n'));
            qrcodeTerminal.generate(qr, { small: true });
        }

        await tryRequestPairingCode(connection, qr);

        if (connection === 'close') {
            const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
            const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

            console.log(chalk.red(`Koneksi terputus. Status: ${statusCode}. Reconnect: ${shouldReconnect}`));

            if (shouldReconnect) {
                startBot();
            } else {
                console.log(chalk.red('Sesi logout. Hapus folder sessions/ lalu jalankan ulang untuk login baru.'));
            }
        } else if (connection === 'open') {
            banner.printReady(sock.user?.id?.split(':')[0] || 'Unknown');

            const firstConnect = recordFirstConnectIfNeeded();
            const daysSince = Math.floor((Date.now() - firstConnect) / (1000 * 60 * 60 * 24));
            if (daysSince < 7) {
                console.log(chalk.yellow(`⚠️  Bot masih dalam masa "pemanasan" (hari ke-${daysSince + 1} dari 7). Limit harian otomatis dikurangi untuk mengurangi risiko blokir pada nomor baru. Ini normal dan akan otomatis naik ke limit penuh setelah 7 hari.`));
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // ===== GROUP PARTICIPANTS (welcome/goodbye) =====
    sock.ev.on('group-participants.update', (update) => handleGroupParticipantsUpdate(sock, update));

    // ===== SCHEDULED TASKS & REMINDERS =====
    loadSchedules(sock);
    loadReminders(sock);

    // ===== INCOMING MESSAGES =====
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        // Auto read (opsional, toggle via config)
        if (config.features.autoRead) {
            await sock.readMessages([msg.key]);
        }

        await handleMessage(sock, msg, {
            commandMap,
            isAdmin: (jid, participant) => isGroupAdmin(sock, jid, participant),
            isBotAdmin: (jid) => isBotGroupAdmin(sock, jid),
        });

        // Handler untuk pesan non-command (AI chat mode, RPG battle response, dll)
        await handleNonCommandMessage(sock, msg);
    });

    // ===== MINTA NOMOR TELEPON (setelah semua listener terpasang) =====
    // Ini sengaja dipanggil TERAKHIR, setelah 'connection.update' sudah
    // didaftarkan di atas — supaya event yang keluar duluan (kemungkinan
    // besar saat user masih mengetik jawaban) tetap tertangkap listener,
    // karena tryRequestPairingCode() mengecek pairingNumberReady setiap
    // kali dipanggil, bukan hanya sekali di awal.
    if (sessionMethod === 'pairing' && !sock.authState.creds.registered) {
        const configuredBotNumber = (config.botNumber || '').toString().trim();
        const numberInput = configuredBotNumber
            ? ''
            : await question(chalk.cyanBright('Masukkan nomor WhatsApp bot (contoh 628xxxxxxxxxx, tanpa + atau spasi): '));
        const resolvedNumber = resolvePairingNumber(numberInput, configuredBotNumber);
        const validation = validatePairingNumber(resolvedNumber);

        if (!validation.valid) {
            console.log(chalk.red(`❌ ${validation.reason}`));
            if (validation.reason.includes('kosong')) {
                console.log(chalk.yellow('   Set BOT_NUMBER di .env atau ubah SESSION_METHOD=qr jika console tidak mendukung input interaktif.'));
            }
            console.log(chalk.yellow('   Bot akan keluar sekarang. Perbaiki nomor dan jalankan ulang.'));
            process.exit(1);
        }

        if (configuredBotNumber) {
            console.log(chalk.greenBright(`✅ Menggunakan nomor bot dari .env: ${validation.number}`));
        }

        cleanNumber = validation.number;
        pairingNumberReady = true;

        // Jika socket SUDAH mencapai status connecting SEBELUM user selesai
        // menjawab (skenario yang dulu menyebabkan bug), coba langsung di sini
        // sebagai pengaman tambahan — tryRequestPairingCode() sendiri sudah
        // idempotent (aman dipanggil berkali-kali berkat flag pairingCodeRequested).
        await tryRequestPairingCode('connecting', null);
    }

    return sock;
}

function reloadPlugins() {
    const result = loadPlugins();
    commandMap = result.commandMap;
    allPlugins = result.allPlugins;
    return result;
}

function getSock() {
    return sock;
}

function getPlugins() {
    return { commandMap, allPlugins };
}

module.exports = { startBot, reloadPlugins, getSock, getPlugins, validatePairingNumber };
