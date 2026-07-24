const { visionAnalyze } = require('../../lib/aiService');
const { downloadUrlToBuffer } = require('../../lib/featureHelpers');

module.exports = {
    command: ['ocr', 'scantext'],
    category: 'tools',
    description: 'Baca teks dari gambar menggunakan AI vision.',
    cooldown: 5,
    limitCost: 2,
    execute: async (msg, { sock, jid, text, args }) => {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage || msg.message?.imageMessage;
        const imageUrl = args[0] || '';

        if (!quoted && !imageUrl) {
            return sock.sendMessage(jid, { text: '🖼️ Reply gambar atau kirim URL gambar dengan caption *.ocr*' }, { quoted: msg });
        }

        try {
            let buffer;
            if (imageUrl) {
                buffer = await downloadUrlToBuffer(imageUrl);
            } else {
                const imageMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage || msg.message?.imageMessage;
                if (!imageMsg?.url) {
                    return sock.sendMessage(jid, { text: '❌ Gambar tidak ditemukan pada pesan yang direply.' }, { quoted: msg });
                }
                buffer = await downloadUrlToBuffer(imageMsg.url);
            }

            const result = await visionAnalyze(buffer, 'Extract all visible text from this image and return it in a clear, plain format.');
            if (!result.success) {
                return sock.sendMessage(jid, { text: result.error || '❌ Gagal membaca teks dari gambar.' }, { quoted: msg });
            }

            await sock.sendMessage(jid, { text: `📝 *Hasil OCR*\n\n${result.reply || result.transcript || 'Tidak ada teks yang terbaca.'}` }, { quoted: msg });
        } catch (err) {
            await sock.sendMessage(jid, { text: `❌ Gagal memproses OCR. ${err.message}` }, { quoted: msg });
        }
    }
};
