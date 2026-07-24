const config = require('../config/config');
const groupModel = require('./groupModel');
const { isGroupAdmin } = require('./groupUtils');
const userModel = require('./userModel');
const { _getAutoReplyText } = require('../plugins/automation/autoreply');

// Menyimpan chat mode AI per-user (aktif via command .aichat on)
const aiChatSessions = new Set();

const linkRegex = /(https?:\/\/|www\.)\S*(chat\.whatsapp\.com|discord\.gg|t\.me|bit\.ly)\S*/i;
const badWordRegex = /(anjing|bangsat|babi|kontol|memek|sange|tolol|goblok|asu|bodoh|cacat|ngentot|kampret|silit)/i;

function enableAiChat(jid) {
    aiChatSessions.add(jid);
}
function disableAiChat(jid) {
    aiChatSessions.delete(jid);
}
function isAiChatEnabled(jid) {
    return aiChatSessions.has(jid);
}

async function handleMenuNav(sock, msg, jid, body) {
    const { _handleMenuNavigation } = require('../plugins/tools/menu.js');
    return _handleMenuNavigation(sock, msg, jid, body);
}

async function handleToggleNav(sock, msg, jid, body, ctx) {
    const { _handleToggleNavigation } = require('../plugins/owner/toggle.js');
    return _handleToggleNavigation(sock, msg, jid, body, ctx);
}

async function handleGuessNumberGame(sock, msg, jid, body) {
    const { _activeGames } = require('../plugins/fun/tebakangka.js');
    if (!_activeGames.has(jid)) return false;

    const guess = parseInt(body.trim());
    if (isNaN(guess)) return false;

    const game = _activeGames.get(jid);
    game.attempts++;

    if (guess === game.target) {
        _activeGames.delete(jid);
        const sender = msg.key.participant || jid;
        userModel.addXp(sender, 20);
        await sock.sendMessage(jid, {
            text: `🎉 Benar! Angkanya adalah *${game.target}*.\nKamu berhasil dalam ${game.attempts} percobaan.\n+20 XP!`
        }, { quoted: msg });
        return true;
    }

    if (game.attempts >= game.maxAttempts) {
        _activeGames.delete(jid);
        await sock.sendMessage(jid, {
            text: `💔 Game over! Kesempatan habis.\nAngka yang benar adalah *${game.target}*.`
        }, { quoted: msg });
        return true;
    }

    const hint = guess < game.target ? 'lebih besar 📈' : 'lebih kecil 📉';
    await sock.sendMessage(jid, {
        text: `❌ Salah! Coba angka ${hint}.\nSisa kesempatan: ${game.maxAttempts - game.attempts}`
    }, { quoted: msg });
    return true;
}

async function handleNonCommandMessage(sock, msg) {
    const jid = msg.key.remoteJid;
    const isGroup = jid.endsWith('@g.us');
    const sender = isGroup ? msg.key.participant : jid;
    const senderAlt = isGroup ? msg.key.participantAlt : msg.key.remoteJidAlt;
    const numberFromSender = sender?.replace(/\D/g, '') || '';
    const numberFromAlt = senderAlt?.replace(/\D/g, '') || '';
    const isOwner = numberFromSender.includes(config.ownerNumber) || numberFromAlt.includes(config.ownerNumber);

    const body =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        '';

    if (!body) return;
    // Jika pesan adalah command (diawali prefix), skip — sudah ditangani messageHandler
    if (config.prefix.some(p => body.startsWith(p))) return;

    // ===== NAVIGASI TOGGLE BERNOMOR (cek dulu sebelum handler lain) =====
    const toggleNavHandled = await handleToggleNav(sock, msg, jid, body, { isOwner, isGroup });
    if (toggleNavHandled) return;

    // ===== NAVIGASI MENU INTERAKTIF (cek dulu sebelum handler lain) =====
    const menuNavHandled = await handleMenuNav(sock, msg, jid, body);
    if (menuNavHandled) return;

    // ===== GAME TEBAK ANGKA (cek dulu sebelum handler lain) =====
    const gameHandled = await handleGuessNumberGame(sock, msg, jid, body);
    if (gameHandled) return;

    // ===== MODERASI DAN AUTO-REPLY GRUP =====
    if (isGroup) {
        const groupData = groupModel.getGroup(jid);
        if (groupData.antiLink && linkRegex.test(body)) {
            const senderIsAdmin = await isGroupAdmin(sock, jid, sender);
            if (!senderIsAdmin) {
                try {
                    await sock.sendMessage(jid, { delete: msg.key });
                    await sock.sendMessage(jid, {
                        text: `⚠️ @${sender.split('@')[0]} pesan mengandung link terlarang dan telah dihapus.`,
                        mentions: [sender],
                    });
                } catch (err) {
                    console.error('[ANTILINK ERROR]', err.message);
                }
                return;
            }
        }

        const autoReplyText = _getAutoReplyText(body);
        if (groupData.autoReply && autoReplyText) {
            await sock.sendMessage(jid, { text: autoReplyText }, { quoted: msg });
            return;
        }

        if (groupData.antiToxic && badWordRegex.test(body)) {
            try {
                await sock.sendMessage(jid, { delete: msg.key });
                await sock.sendMessage(jid, {
                    text: `⚠️ @${sender.split('@')[0]} mengirim kata kasar dan pesan telah dihapus.`,
                    mentions: [sender],
                });
            } catch (err) {
                console.error('[ANTITOXIC ERROR]', err.message);
            }
            return;
        }
    }

    // ===== AI CHAT MODE (natural, tanpa command) =====
    // Aktif di chat pribadi otomatis, atau di grup jika di-tag/reply bot.
    // Pakai areJidsSameUser() resmi Baileys v7 supaya perbandingan tahan
    // terhadap LID (bot bisa termention sebagai xxxx@lid di beberapa grup).
    const mentionedJids = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    const { areJidsSameUser } = require('./baileysHelper');
    const mentionChecks = await Promise.all(mentionedJids.map(m => areJidsSameUser(m, sock.user.id)));
    const isTaggingBot = mentionChecks.some(Boolean);

    if (config.features.smartReply && ((!isGroup && isAiChatEnabled(sender)) || (isGroup && isTaggingBot))) {
        const aiPlugin = require('../plugins/ai/chat.js');
        await aiPlugin.execute(msg, { sock, args: body.split(' '), text: body, jid, sender, isGroup });
    }
}

module.exports = { handleNonCommandMessage, enableAiChat, disableAiChat, isAiChatEnabled };
