const userModel = require('../../lib/userModel');

module.exports = {
    command: ['prompt', 'promptai'],
    category: 'ai',
    description: 'Kelola template prompt AI kamu untuk chat lebih canggih.',
    limitCost: 0,
    execute: async (msg, { sock, jid, args, sender }) => {
        const sub = (args[0] || '').toLowerCase();
        const user = userModel.getUser(sender);

        if (!sub || sub === 'help') {
            return sock.sendMessage(jid, {
                text: `🤖 *Prompt AI Personal*

Gunakan:
*.prompt list* - lihat semua template prompt kamu
*.prompt add <nama> <isi prompt>* - tambah template baru
*.prompt remove <nama>* - hapus template
*.prompt use <nama>* - aktifkan template untuk AI chat berikutnya
*.prompt clear* - hapus template aktif
*.prompt show* - lihat template aktif saat ini`
            }, { quoted: msg });
        }

        if (sub === 'list') {
            const keys = Object.keys(user.aiPromptTemplates || {});
            if (!keys.length) {
                return sock.sendMessage(jid, { text: '📄 Belum ada template prompt AI. Tambah dengan *.prompt add <nama> <isi prompt>*.' }, { quoted: msg });
            }
            let listText = '📄 *Daftar Prompt AI Kamu:*\n';
            for (const key of keys) {
                listText += `▸ *${key}*\n`;
            }
            listText += '\nGunakan *.prompt show <nama>* untuk melihat isinya, atau *.prompt use <nama>* untuk aktifkan.';
            return sock.sendMessage(jid, { text: listText }, { quoted: msg });
        }

        if (sub === 'show') {
            if (args[1]) {
                const name = args[1].toLowerCase();
                const promptText = user.aiPromptTemplates?.[name];
                if (!promptText) {
                    return sock.sendMessage(jid, { text: `❌ Template prompt *${name}* tidak ditemukan.` }, { quoted: msg });
                }
                return sock.sendMessage(jid, { text: `📌 *${name}*:\n${promptText}` }, { quoted: msg });
            }
            if (!user.activeAiPrompt) {
                return sock.sendMessage(jid, { text: '📌 Belum ada prompt AI aktif.' }, { quoted: msg });
            }
            return sock.sendMessage(jid, { text: `📌 Prompt aktif: *${user.activePromptName || 'custom'}*\n${user.activeAiPrompt}` }, { quoted: msg });
        }

        if (sub === 'add') {
            const name = (args[1] || '').toLowerCase();
            const promptText = args.slice(2).join(' ');
            if (!name || !promptText) {
                return sock.sendMessage(jid, { text: '📝 Format: *.prompt add <nama> <isi prompt>*' }, { quoted: msg });
            }
            const templates = { ...(user.aiPromptTemplates || {}) };
            templates[name] = promptText;
            userModel.updateUser(sender, { aiPromptTemplates: templates });
            return sock.sendMessage(jid, { text: `✅ Template prompt *${name}* berhasil disimpan.` }, { quoted: msg });
        }

        if (sub === 'remove') {
            const name = (args[1] || '').toLowerCase();
            if (!name) {
                return sock.sendMessage(jid, { text: '📝 Format: *.prompt remove <nama>*' }, { quoted: msg });
            }
            const templates = { ...(user.aiPromptTemplates || {}) };
            if (!templates[name]) {
                return sock.sendMessage(jid, { text: `❌ Template prompt *${name}* tidak ditemukan.` }, { quoted: msg });
            }
            delete templates[name];
            const activePromptCleared = user.activePromptName === name;
            userModel.updateUser(sender, {
                aiPromptTemplates: templates,
                activeAiPrompt: activePromptCleared ? '' : user.activeAiPrompt,
                activePromptName: activePromptCleared ? '' : user.activePromptName,
            });
            return sock.sendMessage(jid, { text: `✅ Template prompt *${name}* berhasil dihapus.` }, { quoted: msg });
        }

        if (sub === 'use') {
            const name = (args[1] || '').toLowerCase();
            if (!name) {
                return sock.sendMessage(jid, { text: '📝 Format: *.prompt use <nama>*' }, { quoted: msg });
            }
            const promptText = user.aiPromptTemplates?.[name];
            if (!promptText) {
                return sock.sendMessage(jid, { text: `❌ Template prompt *${name}* tidak ditemukan.` }, { quoted: msg });
            }
            userModel.updateUser(sender, { activeAiPrompt: promptText, activePromptName: name });
            return sock.sendMessage(jid, { text: `✅ Template prompt *${name}* diaktifkan untuk AI chat berikutnya.` }, { quoted: msg });
        }

        if (sub === 'clear') {
            userModel.updateUser(sender, { activeAiPrompt: '', activePromptName: '' });
            return sock.sendMessage(jid, { text: '✅ Prompt AI aktif telah dihapus.' }, { quoted: msg });
        }

        return sock.sendMessage(jid, { text: '❓ Sub-command prompt tidak dikenal. Ketik *.prompt help* untuk bantuan.' }, { quoted: msg });
    }
};