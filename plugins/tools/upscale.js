const { downloadContentFromMessage } = require('../../lib/baileysHelper');
const { upscaleImage } = require('../../lib/trxFeatures');

async function streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
}

module.exports = {
    command: ['upscale', 'hd', 'enhanceimg', 'aiupscale'],
    category: 'tools',
    description: 'Naikkan kualitas gambar dengan AI',
    cooldown: 5,
    limitCost: 1,
    execute: async (msg, { sock, jid, text, args }) => {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const imageMsg = quoted?.imageMessage || msg.message?.imageMessage;

        let imageBuffer = null;

        if (imageMsg) {
            const stream = await downloadContentFromMessage(imageMsg, 'image');
            imageBuffer = await streamToBuffer(stream);
        } else if (text) {
            try {
                const { data } = await require('axios').get(text.trim(), { responseType: 'arraybuffer' });
                imageBuffer = Buffer.from(data);
            } catch (err) {
                return sock.sendMessage(jid, { text: '❌ URL gambar tidak valid atau tidak bisa diakses.' }, { quoted: msg });
            }
        }

        if (!imageBuffer) {
            return sock.sendMessage(jid, {
                text: '🖼️ Reply gambar atau kirim URL gambar dengan caption *.upscale*\nContoh: *.upscale 4*',
            }, { quoted: msg });
        }

        await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });

        try {
            const scale = parseInt(args[0] || '4', 10);
            const result = await upscaleImage(imageBuffer, { scale });
            await sock.sendMessage(jid, {
                image: { url: result.url },
                caption: '✨ Hasil upscaling AI siap dilihat.',
            }, { quoted: msg });
            await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
        } catch (err) {
            await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
            await sock.sendMessage(jid, { text: `❌ Gagal mengolah gambar.\nDetail: ${err.message}` }, { quoted: msg });
        }
    }
};
