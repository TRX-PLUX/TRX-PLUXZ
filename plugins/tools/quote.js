const axios = require('axios');

module.exports = {
    command: ['quote', 'quotes'],
    category: 'tools',
    description: 'Mengambil quote acak.',
    cooldown: 2,
    limitCost: 1,
    execute: async (msg, { sock, jid }) => {
        try {
            const { data } = await axios.get('https://api.quotable.io/random', { timeout: 20000 });
            await sock.sendMessage(jid, { text: `💬 *Quote*\n\n“${data.content}”\n\n— ${data.author}` }, { quoted: msg });
        } catch (err) {
            await sock.sendMessage(jid, { text: '❌ Gagal mengambil quote.' }, { quoted: msg });
        }
    }
};
