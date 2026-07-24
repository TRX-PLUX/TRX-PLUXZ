const userModel = require('../../lib/userModel');

module.exports = {
    command: ['allmenu', 'fullmenu', 'semuamenu'],
    category: 'main',
    description: 'Menampilkan SEMUA command bot secara lengkap.',
    cooldown: 3,
    limitCost: 0,
    execute: async (msg, { sock, jid, sender, isOwner }) => {
        const { getPlugins } = require('../../lib/connection');
        const { allPlugins } = getPlugins();
        const menuPlugin = require('./menu.js');
        const user = userModel.getUser(sender);

        const text = menuPlugin._buildAllMenuText(user, allPlugins, isOwner);
        await sock.sendMessage(jid, { text }, { quoted: msg });

        const grouped = {};
        for (const plugin of allPlugins) {
            const cat = plugin._category || 'lainnya';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(plugin);
        }

        const categories = Object.keys(grouped).slice(0, 10);
        if (categories.length) {
            const options = categories.map(cat => `${cat}`);
            try {
                await sock.sendMessage(jid, {
                    text: '📚 *Menu lengkap TRX-BTT*\nPilih kategori untuk lihat daftar fitur yang lebih rapi.',
                    poll: {
                        name: 'Pilih kategori menu lengkap',
                        values: options,
                        selectableCount: 1,
                    },
                }, { quoted: msg });
            } catch (err) {
                console.warn('[ALLMENU] Poll tidak didukung, fallback ke teks biasa:', err.message);
            }
        }
    }
};
