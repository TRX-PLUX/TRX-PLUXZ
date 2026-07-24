const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const FormData = require('form-data');

async function downloadUrlToBuffer(url) {
    const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
    return Buffer.from(response.data);
}

function createTempFile(buffer, extension = 'bin') {
    const tempDir = path.join(__dirname, '..', 'tmp');
    fs.mkdirSync(tempDir, { recursive: true });
    const filePath = path.join(tempDir, `trx-${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`);
    fs.writeFileSync(filePath, buffer);
    return filePath;
}

function removeTempFile(filePath) {
    try {
        if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch {}
}

async function removeBackground(buffer) {
    const filePath = createTempFile(buffer, 'png');
    try {
        const form = new FormData();
        form.append('image', fs.createReadStream(filePath));
        form.append('format', 'png');
        form.append('model', 'v1');

        const response = await axios.post('https://api2.pixelcut.app/image/matte/v1', form, {
            headers: {
                ...form.getHeaders(),
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/json, text/plain, */*',
                'origin': 'https://www.pixa.com',
                'referer': 'https://www.pixa.com/',
            },
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
            timeout: 120000,
        });

        if (!response.data || Buffer.isBuffer(response.data)) {
            return response.data || Buffer.alloc(0);
        }

        if (typeof response.data === 'string') {
            return Buffer.from(response.data, 'base64');
        }

        return Buffer.from(response.data);
    } finally {
        removeTempFile(filePath);
    }
}

module.exports = { downloadUrlToBuffer, createTempFile, removeTempFile, removeBackground };
