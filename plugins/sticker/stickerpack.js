const { searchStickerPack } = require('../../lib/trxFeatures');

module.exports = {
    command: ['stickerpack', 'searchsticker', 'spack'],
    category: 'sticker',
    description: 'Cari sticker pack dari database sticker internal',
    cooldown: 3,
    limitCost: 1,
    execute: async (msg, { sock, jid, text }) => {
        if (!text) {
            return sock.sendMessage(jid, {
                text: '📦 Ketik *.stickerpack <nama pack>* untuk mencari sticker pack.',
            }, { quoted: msg });
        }

        const packs = await searchStickerPack(text.trim());
        if (!packs.length) {
            return sock.sendMessage(jid, { text: '❌ Tidak ada hasil sticker pack untuk pencarian tersebut.' }, { quoted: msg });
        }

        const preview = packs.slice(0, 8).map((pack, index) => {
            return `${index + 1}. ${pack.name}\n   ↳ slug: ${pack.slug || '-'}\n   ↳ download: ${pack.download}`;
        }).join('\n\n');

        await sock.sendMessage(jid, {
            text: `📦 Hasil pencarian sticker pack untuk *${text.trim()}*:\n\n${preview}`,
        }, { quoted: msg });
    }
};
