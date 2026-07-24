const groupModel = require('../../lib/groupModel');

const badWordRegex = /(anjing|bangsat|babi|kontol|memek|sange|tolol|goblok|asu|bodoh|cacat|ngentot|kampret|silit)/i;

module.exports = {
    command: ['antitoxic', 'badword'],
    category: 'automation',
    description: 'Mengaktifkan filter kata kasar di grup.',
    groupOnly: true,
    adminOnly: true,
    cooldown: 2,
    limitCost: 0,
    execute: async (msg, { sock, jid, text }) => {
        const groupData = groupModel.getGroup(jid);
        if (!text) {
            return sock.sendMessage(jid, { text: `🛡️ Status anti-badword: ${groupData.antiToxic ? 'AKTIF' : 'MATI'}` }, { quoted: msg });
        }

        const enabled = /on|aktif|yes/i.test(text);
        groupModel.updateGroup(jid, { antiToxic: enabled });
        await sock.sendMessage(jid, { text: `✅ Anti-badword ${enabled ? 'diaktifkan' : 'dimatikan'} untuk grup ini.` }, { quoted: msg });
    }
};
