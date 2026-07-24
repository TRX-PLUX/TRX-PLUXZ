(async ()=>{
  const d = require('../lib/downloader');
  const tests = [
    {n:'TikTok', f: d.downloadTikTok, url:'https://www.tiktok.com/@scout2015/video/6718335390845095173'},
    {n:'YouTube', f: d.downloadYouTube, url:'https://www.youtube.com/watch?v=dQw4w9WgXcQ'},
    {n:'Instagram', f: d.downloadInstagram, url:'https://www.instagram.com/p/CG0UU3lH1bA/'},
    {n:'Twitter', f: d.downloadTwitter, url:'https://twitter.com/jack/status/20'},
    {n:'Facebook', f: d.downloadFacebook, url:'https://www.facebook.com/zuck/posts/10102577175875681'},
    {n:'Pinterest', f: d.downloadPinterest, url:'https://www.pinterest.com/pin/99360735500167749/'}
  ];

  for (const t of tests) {
    process.stdout.write(t.n + '... ');
    try {
      const res = await Promise.race([
        t.f(t.url),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 20000))
      ]);
      console.log('OK', res && res.success ? 'success' : 'failed', Object.keys(res || {}).filter(k => k !== 'success').slice(0,3));
    } catch (e) {
      console.log('ERROR', e.message);
    }
  }
})();
