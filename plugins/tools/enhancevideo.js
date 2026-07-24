const { downloadContentFromMessage } = require('../../lib/baileysHelper');
const { enhanceVideo } = require('../../lib/trxFeatures');

async function streamToBuffer(stream) {
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    return Buffer.concat(chunks);
}

module.exports = {
    command: ['enhancevideo', 'hdvideo', 'videoenhance', 'aivideo'],
    category: 'tools',
    description: 'Perbaiki kualitas video dengan AI',
    cooldown: 8,
    limitCost: 2,
    execute: async (msg, { sock, jid, text }) => {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const videoMsg = quoted?.videoMessage || msg.message?.videoMessage;

        let videoBuffer = null;

        if (videoMsg) {
            const stream = await downloadContentFromMessage(videoMsg, 'video');
            videoBuffer = await streamToBuffer(stream);
        } else if (text) {
            try {
                const { data } = await require('axios').get(text.trim(), { responseType: 'arraybuffer' });
                videoBuffer = Buffer.from(data);
            } catch (err) {
                return sock.sendMessage(jid, { text: '❌ URL video tidak valid atau tidak bisa diakses.' }, { quoted: msg });
            }
        }

        if (!videoBuffer) {
            return sock.sendMessage(jid, {
                text: '🎬 Reply video pendek dengan caption *.enhancevideo*\nContoh: *.enhancevideo*',
            }, { quoted: msg });
        }

        await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });

        try {
            const result = await enhanceVideo(videoBuffer, '4k');
            await sock.sendMessage(jid, {
                video: { url: result.output_url },
                caption: '✨ Video hasil AI enhancer siap dikirim.',
            }, { quoted: msg });
            await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });
        } catch (err) {
            await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
            await sock.sendMessage(jid, { text: `❌ Gagal memperbaiki video.\nDetail: ${err.message}` }, { quoted: msg });
        }
    }
};
