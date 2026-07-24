const axios = require('axios');

module.exports = {
    command: ['story', 'statusdl'],
    category: 'downloader',
    description: 'Download status/story dari URL atau link publik.',
    cooldown: 3,
    limitCost: 1,
    execute: async (msg, { sock, jid, text }) => {
        if (!text) {
            return sock.sendMessage(jid, { text: '📥 Format: *.story <url>*' }, { quoted: msg });
        }

        try {
            const response = await axios.get(text, { responseType: 'arraybuffer', timeout: 30000 });
            const buffer = Buffer.from(response.data);
            await sock.sendMessage(jid, { image: buffer, caption: '📸 Story/Status' }, { quoted: msg });
        } catch (err) {
            await sock.sendMessage(jid, { text: `❌ Gagal mengunduh. ${err.message}` }, { quoted: msg });
        }
    }
};
