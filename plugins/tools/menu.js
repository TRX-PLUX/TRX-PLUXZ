const config = require('../../config/config');
const userModel = require('../../lib/userModel');
const moment = require('moment-timezone');
const navSession = require('../../lib/navSessionManager');

const MENU_SESSION_TTL = 3 * 60 * 1000;
const POLL_MENU_TTL = 3 * 60 * 1000;

const CATEGORY_ICONS = {
    main: '📋', ai: '🤖', downloader: '📥', converter: '🔄',
    group: '👥', owner: '👑', tools: '🛠️', fun: '🎉',
    sticker: '🖼️', payment: '💳', website: '🌐', rpg: '⚔️', economy: '💰', media: '🎞️'
};

const CATEGORY_LABELS = {
    main: 'Menu Utama', ai: 'AI & Chatbot', downloader: 'Downloader', converter: 'Converter Media',
    group: 'Manajemen Grup', owner: 'Owner Only', tools: 'Tools & Utilitas', fun: 'Game & Hiburan',
    sticker: 'Sticker Maker', payment: 'Premium & Payment', website: 'Website Generator',
    rpg: 'RPG & Kerja', economy: 'Ekonomi & Saldo', media: 'Media & Editing'
};

const HIGHLIGHT_COMMANDS = {
    ai: ['ai', 'imagine', 'tts', 'persona', 'nsfw', 'prompt'],
    downloader: ['tiktok', 'youtube', 'instagram', 'twitter', 'facebook'],
    tools: ['profile', 'qrcode', 'calc', 'removebg', 'upscale', 'enhancevideo', 'translate'],
    sticker: ['sticker', 'stickerpack'],
    economy: ['daily', 'balance', 'transfer', 'shop', 'leaderboard'],
    fun: ['suit', 'tebakangka', 'mathquiz', 'quotes', 'slots', 'jodoh'],
    group: ['groupinfo', 'setwelcome', 'link', 'lockgroup', 'hidetag'],
};

function buildHeader(user, allPlugins, isOwner = false) {
    const now = moment().tz('Asia/Jakarta').format('dddd, DD MMMM YYYY - HH:mm:ss');
    const totalCommands = allPlugins.reduce((sum, p) => sum + p.command.length, 0);
    const isPremium = userModel.isPremiumActive(user);

    const statusLabel = isOwner ? 'Owner / Pemilik' : (isPremium ? 'Premium ✨' : 'Free');
    const limitLabel = isOwner ? 'Unlimited' : user.dailyLimit;

    let text = `╭─❍❁『 *${config.botName}* 』❁❍\n`;
    text += `│ 👤 User      : ${user.name || 'Belum diatur'}\n`;
    text += `│ 🏷️ Status    : ${statusLabel}\n`;
    text += `│ ⚡ Limit     : ${limitLabel}\n`;
    text += `│ 🕐 Waktu     : ${now}\n`;
    text += `│ 📦 Total Cmd : ${totalCommands}+ command\n`;
    text += `╰────────────────\n\n`;
    return text;
}

function buildGroupSummaryText(grouped) {
    const featured = [];

    Object.entries(HIGHLIGHT_COMMANDS).forEach(([cat, cmds]) => {
        const categoryPlugins = grouped[cat] || [];
        if (!categoryPlugins.length) return;
        const matched = categoryPlugins.filter(p => cmds.some(cmd => p.command.includes(cmd)));
        if (matched.length) {
            const names = matched.slice(0, 3).map(p => `.${p.command[0]}`).join(', ');
            featured.push(`• ${CATEGORY_LABELS[cat] || cat}: ${names}`);
        }
    });

    return featured.length ? `✨ Fitur unggulan:\n${featured.join('\n')}` : '';
}

async function sendPollMenu(sock, jid, msg, user, allPlugins, isOwner) {
    const grouped = {};
    for (const plugin of allPlugins) {
        const cat = plugin._category || 'lainnya';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(plugin);
    }

    const categories = Object.keys(grouped).slice(0, 10);
    const options = categories.map((cat) => {
        const icon = CATEGORY_ICONS[cat] || '📁';
        const label = CATEGORY_LABELS[cat] || cat.toUpperCase();
        return `${icon} ${label}`;
    });

    const pollName = '🧭 Menu TRX-BTT • Pilih kategori';
    const pollText = 'Pilih kategori yang ingin kamu lihat.\n\n✨ Menu ini lebih modern dan interaktif.';
    const fullText = `${buildHeader(user, allPlugins, isOwner)}${pollText}`;

    try {
        await sock.sendMessage(jid, {
            text: fullText,
            poll: {
                name: pollName,
                values: options,
                selectableCount: 1,
            },
        }, { quoted: msg });
    } catch (err) {
        console.warn('[MENU] Poll tidak didukung, fallback ke teks biasa:', err.message);
        await sock.sendMessage(jid, { text: fullText }, { quoted: msg });
    }

    return { categories, grouped };
}

function buildCategoryMenuText(user, allPlugins, isOwner) {
    const grouped = {};
    for (const plugin of allPlugins) {
        const cat = plugin._category || 'lainnya';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(plugin);
    }

    const categories = Object.keys(grouped);
    let text = buildHeader(user, allPlugins, isOwner);
    text += `🗂️ *MENU UTAMA TRX-BTT*\n\n`;

    const summary = buildGroupSummaryText(grouped);
    if (summary) {
        text += `${summary}\n\n`;
    }

    text += `📌 Pilih kategori berikut untuk melihat fitur yang tersedia:\n`;
    categories.forEach((cat, i) => {
        const icon = CATEGORY_ICONS[cat] || '📁';
        const label = CATEGORY_LABELS[cat] || cat.toUpperCase();
        text += `*${i + 1}.* ${icon} ${label} _(${grouped[cat].length} fitur)_\n`;
    });

    text += `\n_💬 Balas dengan angka 1-${categories.length} untuk lihat semua command di kategori ini._\n`;
    text += `_Sesi menu berlaku selama 3 menit._\n\n`;
    text += `_Ketik ${config.prefix[0]}allmenu untuk daftar lengkap semua command._\n`;
    text += `_Ketik ${config.prefix[0]}fitur untuk lihat fitur unggulan yang tersedia._`;

    return { text, categories, grouped };
}

function buildAllMenuText(user, allPlugins, isOwner) {
    const grouped = {};
    for (const plugin of allPlugins) {
        const cat = plugin._category || 'lainnya';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(plugin);
    }

    let text = buildHeader(user, allPlugins, isOwner);
    text += `📚 *SEMUA MENU TRX-BTT*\n\n`;

    Object.entries(grouped).forEach(([cat, plugins]) => {
        const icon = CATEGORY_ICONS[cat] || '📁';
        const label = CATEGORY_LABELS[cat] || cat.toUpperCase();
        text += `${icon} *${label}*\n`;
        plugins.forEach(p => {
            const badge = p.premium ? ' 💎' : '';
            const ownerBadge = p.ownerOnly ? ' 👑' : '';
            const aliasText = p.command.length > 1 ? ` _(alias: ${p.command.slice(1).join(', ')})_` : '';
            const description = p.description ? `\n   ↳ ${p.description}` : '';
            text += `▸ ${config.prefix[0]}${p.command[0]}${badge}${ownerBadge}${aliasText}${description}\n`;
        });
        text += `\n`;
    });

    text += `_📌 Ini adalah daftar lengkap semua command di bot ini._\n`;
    text += `_Created by ${config.ownerName}_`;

    return text;
}

function buildCategoryDetailText(catKey, plugins) {
    const icon = CATEGORY_ICONS[catKey] || '📁';
    const label = CATEGORY_LABELS[catKey] || catKey.toUpperCase();

    let text = `╭─❍❁『 ${icon} *${label}* 』❁❍\n`;
    for (const p of plugins) {
        const badge = p.premium ? ' 💎' : '';
        const ownerBadge = p.ownerOnly ? ' 👑' : '';
        const aliases = p.command.length > 1 ? ` _(alias: ${p.command.slice(1).join(', ')})_` : '';
        text += `│ ${config.prefix[0]}${p.command[0]}${badge}${ownerBadge}${aliases}\n`;
        if (p.description) {
            text += `│   ↳ ${p.description}\n`;
        }
    }
    text += `╰────────────────\n\n`;
    text += `_Ketik ${config.prefix[0]}allmenu lagi untuk kembali ke daftar kategori._`;

    return text;
}

/**
 * Dipanggil dari nonCommandHandler untuk menangkap reply angka terhadap
 * menu LENGKAP (.allmenu) yang sedang aktif. Return true jika pesan ini
 * berhasil ditangani sebagai navigasi menu.
 */
async function handleMenuNavigation(sock, msg, jid, body) {
    const session = navSession.getSession('menu', jid);
    if (!session) return false;
    if (Date.now() > session.expiresAt) {
        navSession.clearSession('menu', jid);
        return false;
    }

    const choice = parseInt(body.trim());
    if (isNaN(choice) || choice < 1 || choice > session.categories.length) return false;

    const catKey = session.categories[choice - 1];
    const plugins = session.grouped[catKey];
    const detailText = buildCategoryDetailText(catKey, plugins);

    await sock.sendMessage(jid, { text: detailText }, { quoted: msg });
    navSession.clearSession('menu', jid); // sesi selesai setelah user pilih 1 kategori
    return true;
}

module.exports = {
    command: ['menu', 'help'],
    category: 'main',
    description: 'Menampilkan kategori menu bot secara interaktif.',
    cooldown: 3,
    limitCost: 0,
    execute: async (msg, { sock, jid, sender, isOwner }) => {
        const { getPlugins } = require('../../lib/connection');
        const { allPlugins } = getPlugins();
        const user = userModel.getUser(sender);

        const { text, categories, grouped } = buildCategoryMenuText(user, allPlugins, isOwner);

        navSession.registerSession('menu', jid, {
            categories,
            grouped,
            expiresAt: Date.now() + MENU_SESSION_TTL,
        });

        await sock.sendMessage(jid, { text }, { quoted: msg });
        await sendPollMenu(sock, jid, msg, user, allPlugins, isOwner);
    },
    _handleMenuNavigation: handleMenuNavigation,
    _buildAllMenuText: buildAllMenuText,
};
