const { textToSpeech } = require('../../lib/ttsClient');
const { translateVoice } = require('../../lib/aiService');

module.exports = {
    command: ['voice', 'audiogen'],
    category: 'ai',
    description: 'Buat voice note dari teks atau terjemahkan voice note menjadi teks.',
    cooldown: 4,
    limitCost: 2,
    execute: async (msg, { sock, jid, text, args }) => {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
        const audioMsg = quoted?.audioMessage || msg.message?.audioMessage;
        if (audioMsg) {
            const buffer = Buffer.from(await (await fetch(audioMsg.url)).arrayBuffer());
            const result = await translateVoice(buffer, 'indonesia');
            if (!result.success) {
                return sock.sendMessage(jid, { text: result.error || '❌ Gagal transkripsi audio.' }, { quoted: msg });
            }
            return sock.sendMessage(jid, { text: `🎙️ *Transkripsi audio*\n\n${result.transcript}` }, { quoted: msg });
        }

        if (!text) {
            return sock.sendMessage(jid, { text: '🔊 Format: *.voice <teks>* atau reply audio dengan caption *.voice*' }, { quoted: msg });
        }

        const result = await textToSpeech(text.slice(0, 400));
        if (!result.success) {
            return sock.sendMessage(jid, { text: result.error }, { quoted: msg });
        }

        await sock.sendMessage(jid, { audio: result.audioBuffer, mimetype: 'audio/mpeg', ptt: true }, { quoted: msg });
    }
};
