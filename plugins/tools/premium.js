const userModel = require('../../lib/userModel');

module.exports = {
    command: ['premiuminfo', 'vipinfo'],
    category: 'tools',
    description: 'Informasi paket premium dan limit khusus.',
    cooldown: 2,
    limitCost: 0,
    execute: async (msg, { sock, jid, sender }) => {
        const user = userModel.getUser(sender);
        const active = userModel.isPremiumActive(user);
        const text = `💎 *Paket Premium*

Status: ${active ? 'AKTIF' : 'BELUM AKTIF'}
Benefit: limit lebih besar, fitur prioritas, dan akses premium.

Ketik *.owner* untuk info kontak owner.`;
        await sock.sendMessage(jid, { text }, { quoted: msg });
    }
};
