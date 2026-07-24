const axios = require('axios');

module.exports = {
    command: ['meme', 'memegen'],
    category: 'tools',
    description: 'Membuat meme sederhana dari teks.',
    cooldown: 3,
    limitCost: 1,
    execute: async (msg, { sock, jid, text }) => {
        if (!text) {
            return sock.sendMessage(jid, { text: '📝 Format: *.meme <teks>*' }, { quoted: msg });
        }

        try {
            const encoded = encodeURIComponent(text);
            const url = `https://api.memegen.link/images/custom/${encoded}.png?background=https://i.imgur.com/0u0u0u0.png`;
            await sock.sendMessage(jid, { image: { url }, caption: '😂 Meme generator' }, { quoted: msg });
        } catch (err) {
            await sock.sendMessage(jid, { text: `❌ Gagal membuat meme. ${err.message}` }, { quoted: msg });
        }
    }
};
