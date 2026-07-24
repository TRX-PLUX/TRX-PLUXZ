const userModel = require('../../lib/userModel');

module.exports = {
    command: ['fitur', 'features', 'feature'],
    category: 'main',
    description: 'Menampilkan daftar fitur unggulan dan fitur AI/media yang tersedia.',
    cooldown: 3,
    limitCost: 0,
    execute: async (msg, { sock, jid, sender, isOwner }) => {
        const { getPlugins } = require('../../lib/connection');
        const { allPlugins } = getPlugins();
        const user = userModel.getUser(sender);
        const isPremium = userModel.isPremiumActive(user);
        const status = isOwner ? 'Owner' : (isPremium ? 'Premium' : 'Free');

        const featured = [
            '🤖 AI Chat, imagine, TTS, prompt, persona',
            '🎨 Remove background, upscale, enhance video',
            '🖼️ Sticker maker dan sticker pack',
            '📥 Downloader YouTube, TikTok, Instagram, Twitter, Facebook',
            '⚙️ Tools seperti translate, qrcode, calc, profile',
            '🎮 Fun game dan ekonomi bot',
        ];

        const text = `╭─❍❁『 *Fitur Unggulan TRX-BTT* 』❁❍\n` +
            `│ 👤 Status : ${status}\n` +
            `│ 📦 Total fitur saat ini : ${allPlugins.length}+\n` +
            `╰────────────────\n\n` +
            featured.map(item => `• ${item}`).join('\n') +
            `\n\n_Ketik .menu untuk melihat kategori menu._`;

        await sock.sendMessage(jid, { text }, { quoted: msg });
    }
};
