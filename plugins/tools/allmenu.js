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
    }
};
