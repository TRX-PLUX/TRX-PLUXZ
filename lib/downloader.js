const axios = require('axios');
const ytdl = require('ytdl-core');
const ytdlp = require('yt-dlp-exec');

const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
const SUPPORTED_VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm', '.mkv', '.avi', '.flv', '.mpg', '.mpeg', '.3gp', '.ogv'];

function getMediaTypeFromExtension(ext) {
    if (SUPPORTED_IMAGE_EXTENSIONS.includes(ext)) return 'image';
    if (SUPPORTED_VIDEO_EXTENSIONS.includes(ext)) return 'video';
    return null;
}

function normalizeYtdlFormats(formats) {
    return formats
        .filter(f => f.url)
        .map(f => ({
            url: f.url,
            type: f.vcodec && f.vcodec !== 'none'
                ? 'video'
                : getMediaTypeFromExtension(`.${String(f.ext || '').toLowerCase()}`) || 'audio',
            quality: f.qualityLabel || f.format_note || f.audioQuality || 'unknown',
            container: f.ext,
            filesize: f.filesize,
        }));
}

async function downloadViaYoutubedlJson(url, extraArgs = {}) {
    const options = {
        dumpSingleJson: true,
        noWarnings: true,
        noCheckCertificates: true,
        preferFreeFormats: true,
        referer: url,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ...extraArgs,
    };

    if (process.env.YTDLP_COOKIES_PATH) {
        options.cookies = process.env.YTDLP_COOKIES_PATH;
    }
    if (process.env.YTDLP_COOKIES_FROM_BROWSER) {
        options.cookiesFromBrowser = process.env.YTDLP_COOKIES_FROM_BROWSER;
    }

    return await ytdlp(url, options);
}

async function fetchPageHtml(url) {
    const { data } = await axios.get(url, {
        timeout: 20000,
        maxRedirects: 5,
        headers: {
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
    });
    return data;
}

function parseMetaTags(html) {
    const result = {};
    const regex = /<meta\s+([^>]+?)\s*\/?>/gi;
    let match;

    while ((match = regex.exec(html))) {
        const attrs = match[1];
        const keyMatch = /(?:property|name)\s*=\s*["']([^"']+)["']/i.exec(attrs);
        const contentMatch = /content\s*=\s*["']([^"']+)["']/i.exec(attrs);
        if (keyMatch && contentMatch) {
            result[keyMatch[1].toLowerCase()] = contentMatch[1];
        }
    }

    return result;
}

function getOgMediaFromMeta(meta, platform = 'generic') {
    const media = [];
    const ogVideo = meta['og:video:url'] || meta['og:video:secure_url'] || meta['og:video'] || meta['video:url'];
    const ogImage = meta['og:image'] || meta['twitter:image:src'] || meta['twitter:image'];
    const card = String(meta['twitter:card'] || '').toLowerCase();

    if (ogVideo) {
        media.push({ url: ogVideo, type: 'video' });
    } else if (ogImage) {
        if (platform === 'twitter' && card === 'summary') {
            return [];
        }
        media.push({ url: ogImage, type: 'image' });
    }

    return media;
}

function getOpenGraphFallbackUrls(url, platform = 'generic') {
    const result = [url];
    try {
        const parsed = new URL(url);
        if (platform === 'facebook' && parsed.hostname.endsWith('facebook.com')) {
            const path = parsed.pathname + parsed.search;
            result.push(`https://m.facebook.com${path}`);
            result.push(`https://mbasic.facebook.com${path}`);
        }
        if (platform === 'instagram' && parsed.hostname.endsWith('instagram.com')) {
            result.push(`${url}?__a=1&__d=dis`);
        }
    } catch (e) {
        // ignore invalid URLs, use original URL only
    }
    return Array.from(new Set(result));
}

async function downloadViaOpenGraph(url, platform = 'generic') {
    const urls = getOpenGraphFallbackUrls(url, platform);
    for (const candidate of urls) {
        try {
            const html = await fetchPageHtml(candidate);
            const meta = parseMetaTags(html);
            const media = getOgMediaFromMeta(meta, platform);
            if (!media.length) {
                continue;
            }

            return {
                success: true,
                media,
                title: meta['og:title'] || meta['twitter:title'] || '',
                text: meta['og:description'] || meta['twitter:description'] || '',
                sourceUrl: candidate,
            };
        } catch (err) {
            continue;
        }
    }

    return { success: false, error: 'OpenGraph fallback tidak menemukan media' };
}

function extractYtdlMedia(info, platform = 'generic') {
    if (Array.isArray(info.entries)) {
        return info.entries.flatMap(entry => extractYtdlMedia(entry, platform));
    }

    const formats = normalizeYtdlFormats(info.formats || []);
    const deduped = Array.from(new Map(formats.map(f => [f.url, f])).values());
    const videos = deduped.filter(f => f.type === 'video');
    const images = deduped.filter(f => f.type === 'image');

    if (platform === 'twitter') {
        return deduped
            .filter(f => f.type === 'video' || f.type === 'image')
            .slice(0, 4)
            .map(f => ({ url: f.url, type: f.type }));
    }

    if (platform === 'facebook') {
        const best = videos.length ? videos[0] : images[0];
        return best ? [{ url: best.url, type: best.type }] : [];
    }

    if (videos.length) {
        return videos.map(f => ({ url: f.url, type: 'video' }));
    }

    if (images.length) {
        return images.map(f => ({ url: f.url, type: 'image' }));
    }

    if (info.thumbnail) {
        return [{ url: info.thumbnail, type: 'image' }];
    }

    return [];
}

async function downloadViaYoutubedl(url) {
    try {
        const info = await downloadViaYoutubedlJson(url);
        const formats = normalizeYtdlFormats(info.formats || []);
        return {
            success: true,
            title: info.title || info.fulltitle || 'Unknown',
            thumbnail: Array.isArray(info.thumbnails) ? info.thumbnails.slice(-1)[0]?.url : info.thumbnail,
            duration: info.duration || info.duration_string,
            formats,
            media: formats.map(f => ({ url: f.url, type: f.type })),
            text: info.description || info.title || '',
        };
    } catch (err) {
        return {
            success: false,
            error: err.stderr || err.message || 'Fallback downloader gagal',
        };
    }
}

async function downloadYouTubeViaYtdl(url) {
    try {
        const info = await ytdl.getInfo(url);
        const formats = info.formats
            .filter(f => f.url && (f.hasVideo || f.hasAudio))
            .map(f => ({
                url: f.url,
                type: f.hasVideo && !f.hasAudio ? 'video' : f.hasAudio && !f.hasVideo ? 'audio' : 'video',
                quality: f.qualityLabel || f.audioQuality || 'unknown',
                container: f.container,
                filesize: Number(f.contentLength || f.bytes || 0),
            }));

        return {
            success: true,
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails?.slice(-1)[0]?.url,
            duration: info.videoDetails.lengthSeconds,
            formats,
        };
    } catch (err) {
        return {
            success: false,
            error: `Fallback YouTube lokal gagal: ${err.message}`,
        };
    }
}

async function downloadTikTok(url) {
    // Sumber utama: tikwm.com (gratis, tidak butuh API key, cukup stabil per Jan 2026)
    try {
        const { data } = await axios.get('https://www.tikwm.com/api/', {
            params: { url, hd: 1 },
            timeout: 20000,
        });

        if (data?.code !== 0 || !data?.data) {
            throw new Error(data?.msg || 'Video tidak ditemukan');
        }

        const result = data.data;
        return {
            success: true,
            title: result.title,
            author: result.author?.nickname || result.author?.unique_id,
            duration: result.duration,
            noWatermark: result.play,
            withWatermark: result.wmplay,
            music: result.music,
            cover: result.cover,
        };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

async function downloadInstagram(url) {
    try {
        const info = await downloadViaYoutubedlJson(url);
        const media = extractYtdlMedia(info, 'instagram');

        if (!media.length) {
            throw new Error('Tidak dapat mengekstrak media Instagram');
        }

        return { success: true, media };
    } catch (err) {
        const fallback = await downloadViaOpenGraph(url, 'instagram');
        if (fallback.success) return fallback;

        return {
            success: false,
            error: `${err.stderr || err.message || 'Gagal mengekstrak Instagram'} (Catatan: Instagram sering memperbarui perlindungan dan extractor youtube-dl mungkin perlu diupdate. Jika terus gagal, tambahkan cookie browser dengan YTDLP_COOKIES_PATH atau YTDLP_COOKIES_FROM_BROWSER.)`,
        };
    }
}

async function downloadYouTube(url) {
    try {
        const fallback = await downloadViaYoutubedl(url);
        if (fallback.success) return fallback;

        const ytFallback = await downloadYouTubeViaYtdl(url);
        if (ytFallback.success) return ytFallback;

        throw new Error(fallback.error || ytFallback.error || 'Video tidak ditemukan');
    } catch (err) {
        const ytFallback = await downloadYouTubeViaYtdl(url);
        if (ytFallback.success) return ytFallback;
        return {
            success: false,
            error: `${err.message} (Catatan: download YouTube butuh API yang lebih stabil untuk skala besar — pertimbangkan provider berbayar jika sering dipakai.)`,
        };
    }
}

async function downloadFacebook(url) {
    try {
        const info = await downloadViaYoutubedlJson(url);
        const media = extractYtdlMedia(info, 'facebook');

        if (!media.length) {
            throw new Error('Tidak dapat mengekstrak video Facebook');
        }

        return {
            success: true,
            hd: media[0].url,
            title: info.title || info.fulltitle || 'Facebook Video',
        };
    } catch (err) {
        const fallback = await downloadViaOpenGraph(url, 'facebook');
        if (fallback.success) {
            return {
                success: true,
                hd: fallback.media[0].url,
                title: fallback.title || 'Facebook Video',
            };
        }

        return { success: false, error: `${err.stderr || err.message || 'Gagal mengekstrak Facebook'} (Catatan: Facebook sering memperbarui dan extractor youtube-dl mungkin perlu diupdate. Jika terus gagal, tambahkan cookie browser dengan YTDLP_COOKIES_PATH atau YTDLP_COOKIES_FROM_BROWSER.)` };
    }
}

async function downloadTwitter(url) {
    try {
        const info = await downloadViaYoutubedlJson(url);
        const media = extractYtdlMedia(info, 'twitter');

        if (!media.length) {
            throw new Error('Tidak dapat mengekstrak media Twitter/X');
        }

        return {
            success: true,
            media,
            text: info.title || info.fulltitle || info.description || '',
        };
    } catch (err) {
        const fallback = await downloadViaOpenGraph(url, 'twitter');
        if (fallback.success) {
            return {
                success: true,
                media: fallback.media,
                text: fallback.text || fallback.title || '',
            };
        }

        return {
            success: false,
            error: `${err.stderr || err.message || 'Gagal mengekstrak Twitter/X'} (Catatan: Twitter/X sering memperbarui dan extractor youtube-dl mungkin perlu diupdate. Jika terus gagal, tambahkan cookie browser dengan YTDLP_COOKIES_PATH atau YTDLP_COOKIES_FROM_BROWSER.)`
        };
    }
}

/**
 * Pinterest — dicoba lewat endpoint universal yang sama. TiklyDown API
 * menyebutkan dukungan multi-platform tapi TIDAK secara eksplisit
 * mengonfirmasi Pinterest dalam dokumentasi yang tersedia publik — fungsi
 * ini best-effort dan WAJIB ditest manual setelah deploy. Jika gagal
 * konsisten, kemungkinan endpoint ini memang tidak mendukung Pinterest.
 */
async function downloadPinterest(url) {
    try {
        const info = await downloadViaYoutubedlJson(url);
        const media = extractYtdlMedia(info, 'pinterest');

        if (!media.length) {
            throw new Error('Tidak dapat mengekstrak media Pinterest');
        }

        return {
            success: true,
            media,
            title: info.title || info.fulltitle || 'Pinterest Media',
        };
    } catch (err) {
        const fallback = await downloadViaOpenGraph(url, 'pinterest');
        if (fallback.success) {
            return {
                success: true,
                media: fallback.media,
                title: fallback.title || 'Pinterest Media',
            };
        }

        return {
            success: false,
            error: `${err.stderr || err.message || 'Gagal mengekstrak Pinterest'} (Catatan: Pinterest sering memperbarui dan extractor youtube-dl mungkin perlu diupdate. Jika terus gagal, tambahkan cookie browser dengan YTDLP_COOKIES_PATH atau YTDLP_COOKIES_FROM_BROWSER.)`
        };
    }
}

module.exports = { downloadTikTok, downloadInstagram, downloadYouTube, downloadFacebook, downloadTwitter, downloadPinterest };
