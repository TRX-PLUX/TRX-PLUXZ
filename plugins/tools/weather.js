const axios = require('axios');

module.exports = {
    command: ['forecast', 'weatherx', 'climate'],
    category: 'tools',
    description: 'Mengecek cuaca untuk kota tertentu.',
    cooldown: 3,
    limitCost: 1,
    execute: async (msg, { sock, jid, text }) => {
        if (!text) {
            return sock.sendMessage(jid, { text: '🌦️ Format: *.weather <nama kota>*' }, { quoted: msg });
        }

        try {
            const { data } = await axios.get('https://wttr.in/' + encodeURIComponent(text) + '?format=j1', { timeout: 20000 });
            const current = data?.current_condition?.[0];
            if (!current) {
                return sock.sendMessage(jid, { text: '❌ Tidak ada data cuaca untuk kota tersebut.' }, { quoted: msg });
            }
            await sock.sendMessage(jid, { text: `🌦️ *${text}*\n\nSuhu: ${current.temp_C}°C\nKondisi: ${current.weatherDesc?.[0]?.value || '-'}\nKelembapan: ${current.humidity}%` }, { quoted: msg });
        } catch (err) {
            await sock.sendMessage(jid, { text: `❌ Gagal mengambil data cuaca. ${err.message}` }, { quoted: msg });
        }
    }
};
