const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function upscaleImage(imageBuffer, { scale = 4 } = {}) {
    if (!Buffer.isBuffer(imageBuffer)) throw new Error('Buffer gambar tidak valid');

    const scales = [1, 4, 8, 16];
    if (!scales.includes(scale)) throw new Error(`Scale tersedia: ${scales.join(', ')}`);

    const identity = uuidv4();
    const inst = axios.create({
        baseURL: 'https://supawork.ai/supawork/headshot/api',
        headers: {
            authorization: 'null',
            origin: 'https://supawork.ai/',
            referer: 'https://supawork.ai/ai-photo-enhancer',
            'user-agent': 'Mozilla/5.0',
            'x-auth-challenge': '',
            'x-identity-id': identity,
        },
    });

    const { data: up } = await inst.get('/sys/oss/token', {
        params: { f_suffix: 'png', get_num: 1, unsafe: 1 },
    });

    const img = up?.data?.[0];
    if (!img) throw new Error('Upload URL tidak ditemukan');

    await axios.put(img.put, imageBuffer, {
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
    });

    const { data: cf } = await axios.post(
        'https://api.nekolabs.web.id/tools/bypass/cf-turnstile',
        {
            url: 'https://supawork.ai/ai-photo-enhancer',
            siteKey: '0x4AAAAAACBjrLhJyEE6mq1c',
        }
    );

    if (!cf?.result) throw new Error('Token challenge gagal dibuat');

    const { data: challenge } = await inst.get('/sys/challenge/token', {
        headers: { 'x-auth-challenge': cf.result },
    });

    const token = challenge?.data?.challenge_token;
    if (!token) throw new Error('Challenge token gagal');

    const { data: task } = await inst.post(
        '/media/image/generator',
        {
            aigc_app_code: 'image_enhancer',
            model_code: 'supawork-ai',
            image_urls: [img.get],
            extra_params: { scale: parseInt(scale, 10) },
            currency_type: 'silver',
            identity_id: identity,
        },
        { headers: { 'x-auth-challenge': token } }
    );

    if (!task?.data?.creation_id) throw new Error('Task pembuatan AI gagal');

    const result = await pollImageResult(inst, identity);
    return { url: result.url };
}

async function pollImageResult(inst, identity) {
    for (let i = 0; i < 60; i++) {
        const { data } = await inst.get('/media/aigc/result/list/v1', {
            params: { page_no: 1, page_size: 10, identity_id: identity },
        });

        const item = data?.data?.list?.[0]?.list?.[0];
        if (item?.status === 1 && item?.url) {
            return item;
        }

        await wait(2000);
    }

    throw new Error('Hasil upscaling belum selesai dalam batas waktu');
}

const UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36';
const API = 'https://api.unblurimage.ai/api/upscaler';

function productserial() {
    const raw = [UA, process.platform, process.arch, Date.now(), Math.random()].join('|');
    return crypto.createHash('md5').update(raw).digest('hex');
}

const product = productserial();

async function uploadVideo(filePath) {
    if (!fs.existsSync(filePath)) throw new Error('File video tidak ditemukan');

    const form = new FormData();
    form.append('video_file_name', path.basename(filePath));

    const res = await axios.post(`${API}/v1/ai-video-enhancer/upload-video`, form, {
        headers: {
            ...form.getHeaders(),
            'user-agent': UA,
            origin: 'https://unblurimage.ai',
            referer: 'https://unblurimage.ai/',
        },
    });

    return res.data.result;
}

async function putToOss(uploadUrl, filePath) {
    const stream = fs.createReadStream(filePath);
    await axios.put(uploadUrl, stream, {
        headers: { 'content-type': 'video/mp4' },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
    });
}

async function createJob(originalVideoUrl, resolution = '4k', preview = false) {
    const form = new FormData();
    form.append('original_video_file', originalVideoUrl);
    form.append('resolution', resolution);
    form.append('is_preview', preview ? 'true' : 'false');

    const res = await axios.post(`${API}/v2/ai-video-enhancer/create-job`, form, {
        headers: {
            ...form.getHeaders(),
            'user-agent': UA,
            origin: 'https://unblurimage.ai',
            referer: 'https://unblurimage.ai/',
            'product-serial': product,
        },
    });

    if (res.data?.code !== 100000) throw new Error(JSON.stringify(res.data));
    return res.data.result.job_id;
}

async function getJob(jobId) {
    const res = await axios.get(`${API}/v2/ai-video-enhancer/get-job/${jobId}`, {
        headers: {
            'user-agent': UA,
            origin: 'https://unblurimage.ai',
            referer: 'https://unblurimage.ai/',
            'product-serial': product,
        },
    });
    return res.data;
}

async function pollVideoJob(jobId, interval = 5000) {
    while (true) {
        const res = await getJob(jobId);
        if (res.code === 100000 && res.result?.output_url) return res.result;
        if (res.code !== 300010) throw new Error(JSON.stringify(res));
        await wait(interval);
    }
}

async function enhanceVideo(videoBuffer, resolution = '4k') {
    if (!Buffer.isBuffer(videoBuffer)) throw new Error('Buffer video tidak valid');

    const tempDir = path.join(__dirname, '..', 'tmp');
    fs.mkdirSync(tempDir, { recursive: true });
    const tempPath = path.join(tempDir, `trx-video-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`);
    fs.writeFileSync(tempPath, videoBuffer);

    try {
        const upload = await uploadVideo(tempPath);
        await putToOss(upload.url, tempPath);
        const cdnUrl = 'https://cdn.unblurimage.ai/' + upload.object_name;
        const jobId = await createJob(cdnUrl, resolution, false);
        const result = await pollVideoJob(jobId);
        return {
            job_id: jobId,
            input_url: result.input_url,
            output_url: result.output_url,
        };
    } finally {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    }
}

async function searchStickerPack(query) {
    try {
        const res = await axios.post('https://getstickerpack.com/api/v1/stickerdb/search', {
            query,
            page: 1,
        }, { timeout: 15000 });

        const data = res?.data?.data || [];
        return data.map(item => ({
            name: item?.title || 'No Title',
            slug: item?.slug || '',
            download: item?.download_counter || 0,
        }));
    } catch (error) {
        return [];
    }
}

module.exports = { upscaleImage, enhanceVideo, searchStickerPack };
