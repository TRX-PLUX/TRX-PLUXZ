const fs = require('fs');
const path = require('path');
const { askAI } = require('../../lib/aiClient');
const config = require('../../config/config');
const userModel = require('../../lib/userModel');
const { loadSystemPrompt } = require('../../lib/promptLoader');

const NSFW_CONFIG_PATH = path.join(__dirname, '..', '..', 'config', 'nsfw.json');

function loadNsfwMedia() {
    try {
        const data = fs.readFileSync(NSFW_CONFIG_PATH, 'utf-8');
        const parsed = JSON.parse(data);
        return {
            images: Array.isArray(parsed.images) ? parsed.images : [],
            videos: Array.isArray(parsed.videos) ? parsed.videos : [],
        };
    } catch (err) {
        console.error('[NSFW LOAD]', err);
        return { images: [], videos: [] };
    }
}

function buildListMessage(title, body, buttonText, rows) {
    return {
        text: body,
        footer: 'Pilih salah satu untuk mengirim media NSFW langsung.',
        title,
        buttonText,
        sections: [{
            title: 'Kategori NSFW',
            rows,
        }],
    };
}

module.exports = {
    command: ['nsfw', 'adult', 'dewasa'],
    category: 'ai',
    description: 'Fitur 18+ untuk konten teks atau media dewasa (hanya user 18+ dan grup NSFW).',
    cooldown: 10,
    limitCost: 2,
    requiresAgeVerified: true,
    execute: async (msg, { sock, jid, text, sender, isGroup }) => {
        const trimmedText = text?.trim() || '';

        if (isGroup) {
            const groupModel = require('../../lib/groupModel');
            const group = groupModel.getGroup(jid);
            if (!group.nsfw) {
                return sock.sendMessage(jid, { text: '⚠️ Fitur NSFW hanya boleh digunakan di grup yang telah diaktifkan NSFW oleh admin.' }, { quoted: msg });
            }
        }

        const mediaLists = loadNsfwMedia();
        const imageLinks = mediaLists.images;
        const videoLinks = mediaLists.videos;

        const supportedImageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const supportedVideoExtensions = ['.mp4', '.mov', '.webm', '.mkv', '.avi'];

        function getMediaTypeFromUrl(link) {
            try {
                const url = new URL(link);
                const pathname = url.pathname.toLowerCase();
                for (const ext of supportedImageExtensions) {
                    if (pathname.endsWith(ext)) return 'image';
                }
                for (const ext of supportedVideoExtensions) {
                    if (pathname.endsWith(ext)) return 'video';
                }
                return null;
            } catch {
                return null;
            }
        }

        async function sendMediaByLink(link) {
            const mediaType = getMediaTypeFromUrl(link);
            if (!mediaType) {
                return sock.sendMessage(jid, { text: '⚠️ Link tidak dikenali sebagai gambar atau video. Pastikan berakhiran .jpg/.png/.mp4/.webm, atau gunakan teks untuk konten generatif.' }, { quoted: msg });
            }

            const payload = mediaType === 'image'
                ? { image: { url: link }, caption: '_Konten NSFW dikirim sesuai link yang disediakan._' }
                : { video: { url: link }, caption: '_Konten NSFW dikirim sesuai link yang disediakan._' };

            await sock.sendMessage(jid, payload, { quoted: msg });
            await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
            return true;
        }

        if (!trimmedText) {
            const rows = [
                { title: 'Gambar NSFW', rowId: '.nsfw image', description: 'Kirim gambar dewasa dari daftar internal' },
                { title: 'Video NSFW', rowId: '.nsfw video', description: 'Kirim video dewasa dari daftar internal' },
                { title: 'Teks NSFW', rowId: '.nsfw teks', description: 'Minta teks dewasa AI sesuai keterangan' },
            ];
            return sock.sendMessage(jid, buildListMessage('Pilih jenis NSFW', 'Silakan pilih gambar, video, atau teks.', 'Pilih NSFW', rows), { quoted: msg });
        }

        const parts = trimmedText.split(/\s+/);
        const commandType = parts[0].toLowerCase();
        const selection = parts[1];

        if (['image', 'gambar'].includes(commandType)) {
            if (!selection) {
                if (!imageLinks.length) {
                    return sock.sendMessage(jid, { text: '⚠️ Belum ada link gambar NSFW yang disimpan. Tambahkan dulu ke file config/nsfw.json.' }, { quoted: msg });
                }

                const rows = imageLinks.map((link, index) => ({
                    title: `Gambar ${index + 1}`,
                    rowId: `.nsfw image ${index + 1}`,
                    description: link,
                }));
                return sock.sendMessage(jid, buildListMessage('Pilih gambar NSFW', 'Pilih salah satu gambar NSFW untuk dikirim langsung.', 'Pilih gambar', rows), { quoted: msg });
            }

            const index = parseInt(selection, 10) - 1;
            if (Number.isNaN(index) || index < 0 || index >= imageLinks.length) {
                return sock.sendMessage(jid, { text: '⚠️ Nomor gambar tidak valid. Gunakan .nsfw image lalu pilih dari daftar.' }, { quoted: msg });
            }
            return sendMediaByLink(imageLinks[index]);
        }

        if (['video', 'vidio'].includes(commandType)) {
            if (!selection) {
                if (!videoLinks.length) {
                    return sock.sendMessage(jid, { text: '⚠️ Belum ada link video NSFW yang disimpan. Tambahkan dulu ke file config/nsfw.json.' }, { quoted: msg });
                }

                const rows = videoLinks.map((link, index) => ({
                    title: `Video ${index + 1}`,
                    rowId: `.nsfw video ${index + 1}`,
                    description: link,
                }));
                return sock.sendMessage(jid, buildListMessage('Pilih video NSFW', 'Pilih salah satu video NSFW untuk dikirim langsung.', 'Pilih video', rows), { quoted: msg });
            }

            const index = parseInt(selection, 10) - 1;
            if (Number.isNaN(index) || index < 0 || index >= videoLinks.length) {
                return sock.sendMessage(jid, { text: '⚠️ Nomor video tidak valid. Gunakan .nsfw video lalu pilih dari daftar.' }, { quoted: msg });
            }
            return sendMediaByLink(videoLinks[index]);
        }

        let aiRequestText = trimmedText;
        if (['teks', 'text', 't'].includes(commandType)) {
            const remaining = parts.slice(1).join(' ').trim();
            if (!remaining) {
                return sock.sendMessage(jid, { text: '🔞 Format: .nsfw teks <permintaan teks dewasa>' }, { quoted: msg });
            }
            aiRequestText = remaining;
        }

        const maybeMediaUrl = trimmedText;
        if (getMediaTypeFromUrl(maybeMediaUrl)) {
            return sendMediaByLink(maybeMediaUrl);
        }

        if (!config.features.aiChat) {
            return sock.sendMessage(jid, { text: '🚫 Fitur AI Chat sedang dimatikan oleh owner.' }, { quoted: msg });
        }

        if (!config.ai.apiKey) {
            return sock.sendMessage(jid, { text: '❌ AI_API_KEY belum dikonfigurasi. Isi AI_API_KEY di file .env lalu restart bot.' }, { quoted: msg });
        }

        await sock.sendMessage(jid, { react: { text: '🔞', key: msg.key } });

        const user = userModel.getUser(sender);
        let systemPrompt = user.aiPersona || loadSystemPrompt();
        if (user.activeAiPrompt) {
            systemPrompt += `\n\n${user.activeAiPrompt}`;
        }
        systemPrompt += '\n\nKamu adalah asisten AI yang memberikan konten teks dewasa secara bertanggung jawab sesuai permintaan, hanya jika permintaan tidak melanggar hukum atau kebijakan platform, dan dijawab dalam gaya yang diinginkan user.';

        const prompt = `Buat teks dewasa untuk permintaan berikut: ${aiRequestText}`;
        const result = await askAI(sender, prompt, systemPrompt, { maxTokens: 1024 });

        if (!result.success) {
            await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
            return sock.sendMessage(jid, { text: result.error }, { quoted: msg });
        }

        await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
        await sock.sendMessage(jid, { text: result.reply }, { quoted: msg });
    }
};