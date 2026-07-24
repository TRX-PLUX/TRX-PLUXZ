const axios = require('axios');

module.exports = {
    command: ['currency', 'converter'],
    category: 'tools',
    description: 'Mengonversi mata uang ke nilai lain.',
    cooldown: 3,
    limitCost: 1,
    execute: async (msg, { sock, jid, args }) => {
        const [amount, from, to] = args;
        if (!amount || !from || !to) {
            return sock.sendMessage(jid, { text: '💱 Format: *.currency <jumlah> <dari> <ke>*\nContoh: .currency 100 usd idr' }, { quoted: msg });
        }

        try {
            const { data } = await axios.get('https://api.exchangerate.host/latest', {
                params: { base: from.toUpperCase(), symbols: to.toUpperCase() },
                timeout: 20000,
            });
            const rate = data?.rates?.[to.toUpperCase()];
            if (!rate) {
                return sock.sendMessage(jid, { text: '❌ Mata uang tidak didukung.' }, { quoted: msg });
            }
            const converted = Number(amount) * rate;
            await sock.sendMessage(jid, { text: `💱 *${amount} ${from.toUpperCase()}* = *${converted.toFixed(2)} ${to.toUpperCase()}*` }, { quoted: msg });
        } catch (err) {
            await sock.sendMessage(jid, { text: `❌ Gagal mengonversi mata uang. ${err.message}` }, { quoted: msg });
        }
    }
};
