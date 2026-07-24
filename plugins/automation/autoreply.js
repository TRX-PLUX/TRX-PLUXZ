const groupModel = require('../../lib/groupModel');

const replies = {
    halo: 'Halo juga! Ada yang bisa saya bantu?',
    hi: 'Hi! Ada yang bisa saya bantu?',
    bye: 'Sampai jumpa!',
    thanks: 'Sama-sama 😊',
};

function getAutoReplyText(text) {
    if (!text) return '';
    const normalized = text.toLowerCase();
    const key = Object.keys(replies).find(k => normalized.includes(k));
    return key ? replies[key] : '';
}

module.exports = {
    command: ['autoreply', 'autorespond'],
    category: 'automation',
    description: 'Aktifkan balasan otomatis sederhana pada grup.',
    groupOnly: true,
    adminOnly: true,
    cooldown: 2,
    limitCost: 0,
    execute: async (msg, { sock, jid, text }) => {
        const groupData = groupModel.getGroup(jid);
        if (!text) {
            return sock.sendMessage(jid, { text: `🤖 Status auto-reply: ${groupData.autoReply ? 'AKTIF' : 'MATI'}` }, { quoted: msg });
        }

        const enabled = /on|aktif|yes/i.test(text);
        groupModel.updateGroup(jid, { autoReply: enabled });
        await sock.sendMessage(jid, { text: `✅ Auto-reply ${enabled ? 'diaktifkan' : 'dimatikan'} untuk grup ini.` }, { quoted: msg });
    },
    _getAutoReplyText: getAutoReplyText,
};
