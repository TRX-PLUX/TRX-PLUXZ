const { downloadContentFromMessage } = require('../../lib/baileysHelper');
const { removeBackground, downloadUrlToBuffer } = require('../../lib/featureHelpers');

async function streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
}

module.exports = {
    command: ['removebg', 'nobg', 'background', 'bgremove'],
    category: 'tools',
    description: 'Hapus background dari gambar dengan AI-style processing',
    cooldown: 5,
    limitCost: 1,
    execute: async (msg, { sock, jid, text }) => {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const imageMsg = quoted?.imageMessage || msg.message?.imageMessage;

        let imageBuffer = null;
        if (imageMsg) {
            const stream = await downloadContentFromMessage(imageMsg, 'image');
            imageBuffer = await streamToBuffer(stream);
        } else if (text) {
            try {
                imageBuffer = await downloadUrlToBuffer(text.trim());
            } catch (err) {
                return sock.sendMessage(jid, { text: '❌ URL gambar tidak valid atau tidak bisa diakses.' }, { quoted: msg });
            }
        }

        if (!imageBuffer) {
            return sock.sendMessage(jid, { text: '🖼️ Reply gambar atau kirim URL gambar dengan caption *.removebg*' }, { quoted: msg });
        }

        await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });
        try {
            const resultBuffer = await removeBackground(imageBuffer);
            if (!resultBuffer || resultBuffer.length < 100) {
                throw new Error('Hasil background removal kosong');
            }
            await sock.sendMessage(jid, { image: resultBuffer }, { quoted: msg });
            await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
        } catch (err) {
            await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
            await sock.sendMessage(jid, { text: `❌ Gagal menghapus background.\nDetail: ${err.message}` }, { quoted: msg });
        }
    }
};
