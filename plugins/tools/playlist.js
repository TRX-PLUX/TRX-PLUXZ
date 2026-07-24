const axios = require('axios');

module.exports = {
    command: ['playlist', 'ytplaylist'],
    category: 'downloader',
    description: 'Mencoba mengambil informasi playlist YouTube.',
    cooldown: 3,
    limitCost: 1,
    execute: async (msg, { sock, jid, text }) => {
        if (!text) {
            return sock.sendMessage(jid, { text: '🎵 Format: *.playlist <url_playlist>*' }, { quoted: msg });
        }

        try {
            const response = await axios.get('https://www.youtube.com/oembed', { params: { url: text, format: 'json' }, timeout: 20000 });
            await sock.sendMessage(jid, { text: `🎵 Playlist info:\n\n${response.data?.title || text}` }, { quoted: msg });
        } catch (err) {
            await sock.sendMessage(jid, { text: `❌ Gagal mengambil info playlist. ${err.message}` }, { quoted: msg });
        }
    }
};
