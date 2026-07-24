const crypto = require('crypto');

module.exports = {
    command: ['randompass', 'genpass'],
    category: 'tools',
    description: 'Membuat password acak yang lebih aman.',
    cooldown: 2,
    limitCost: 1,
    execute: async (msg, { sock, jid, args }) => {
        const length = parseInt(args[0] || '16');
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+';
        let password = '';
        for (let i = 0; i < Math.max(8, Math.min(length, 32)); i++) {
            password += chars[crypto.randomInt(chars.length)];
        }
        await sock.sendMessage(jid, { text: `🔐 Password acak:\n${password}` }, { quoted: msg });
    }
};
