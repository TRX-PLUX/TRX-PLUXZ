const axios = require('axios');
const FormData = require('form-data');
const { downloadUrlToBuffer } = require('../../lib/featureHelpers');

module.exports = {
    command: ['qrscan', 'scanqr'],
    category: 'tools',
    description: 'Memindai QR code dari gambar.',
    cooldown: 5,
    limitCost: 2,
    execute: async (msg, { sock, jid, args }) => {
        const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage || msg.message?.imageMessage;
        const imageUrl = args[0] || '';

        if (!quoted && !imageUrl) {
            return sock.sendMessage(jid, { text: '📷 Reply gambar QR atau kirim URL gambar dengan caption *.qrscan*' }, { quoted: msg });
        }

        try {
            let buffer;
            if (imageUrl) {
                buffer = await downloadUrlToBuffer(imageUrl);
            } else {
                const imageMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage || msg.message?.imageMessage;
                if (!imageMsg?.url) {
                    return sock.sendMessage(jid, { text: '❌ Gambar QR tidak ditemukan.' }, { quoted: msg });
                }
                buffer = await downloadUrlToBuffer(imageMsg.url);
            }

            const form = new FormData();
            form.append('image', buffer, { filename: 'qr.png' });
            const response = await axios.post('https://api.qrserver.com/v1/read-qr-code/', form, {
                headers: form.getHeaders(),
                timeout: 30000,
            });

            const result = response.data?.[0]?.symbol?.[0]?.data || 'Tidak ada data QR yang terbaca.';
            await sock.sendMessage(jid, { text: `🔍 *Hasil QR Scan*\n\n${result}` }, { quoted: msg });
        } catch (err) {
            await sock.sendMessage(jid, { text: `❌ Gagal memindai QR. ${err.message}` }, { quoted: msg });
        }
    }
};
