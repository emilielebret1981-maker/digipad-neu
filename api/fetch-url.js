const https = require('https');
const http = require('http');
const { URL } = require('url');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  let body = req.body;
  if (!body || !body.url) {
    try {
      const raw = await new Promise((resolve, reject) => {
        let d = '';
        req.on('data', c => { d += c; });
        req.on('end', () => resolve(d));
        req.on('error', reject);
      });
      body = JSON.parse(raw);
    } catch(e) { body = {}; }
  }

  const url = body && body.url;
  const type = body && body.type;

  if (!url || !url.startsWith('http')) return res.status(200).json({ content: '[URL invalide]' });
  if (type === 'image') return res.status(200).json({ content: '[Image]' });
  if (type === 'video') return res.status(200).json({ content: '[Video: ' + url + ']' });
  if (type === 'pdf' || url.toLowerCase().includes('.pdf')) {
    return res.status(200).json({ content: '[PDF: ' + url + ']' });
  }

  try {
    const content = await doFetch(url, 0);
    return res.status(200).json({ content });
  } catch(err) {
    return res.status(200).json({ content: '[Erreur: ' + err.message + ']' });
  }
};

function doFetch(url, redirects) {
  return new Promise(function(resolve, reject) {
    if (redirects > 5) return reject(new Error('trop de redirections'));
    var parsed;
    try { parsed = new URL(url); } catch(e) { return resolve('[URL malformee]'); }
    var lib = parsed.protocol === 'https:' ? https : http;
    var opts = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      timeout: 12000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,*/*;q=0.9',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      }
    };
    var req = lib.request(opts, function(response) {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        var next = response.headers.location.startsWith('http')
          ? response.headers.location
          : parsed.protocol + '//' + parsed.hostname + response.headers.location;
        return resolve(doFetch(next, redirects + 1));
      }
      if (response.statusCode !== 200) return resolve('[HTTP ' + response.statusCode + ': ' + url + ']');
      var data = '';
      response.setEncoding('utf8');
      response.on('data', function(chunk) { data += chunk; if (data.length > 200000) response.destroy(); });
      response.on('end', function() { resolve(extractText(data, url)); });
      response.on('error', reject);
    });
    req.on('timeout', function() { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
    req.end();
  });
}

function extractText(html, url) {
  var t = html;
  t = t.replace(/(<script[\s\S]*?<\/script>)/gi, ' ');
  t = t.replace(/(<style[\s\S]*?<\/style>)/gi, ' ');
  t = t.replace(/(<nav[\s\S]*?<\/nav>)/gi, ' ');
  t = t.replace(/(<header[\s\S]*?<\/header>)/gi, ' ');
  t = t.replace(/(<footer[\s\S]*?<\/footer>)/gi, ' ');
  t = t.replace(/(<aside[\s\S]*?<\/aside>)/gi, ' ');
  t = t.replace(/(<form[\s\S]*?<\/form>)/gi, ' ');
  var tm = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  var title = tm ? tm[1].replace(/<[^>]+>/g, '').trim() : '';
  t = t.replace(/<br[^>]*>/gi, '\n').replace(/<\/p>/gi, '\n\n');
  t = t.replace(/<\/div>/gi, '\n').replace(/<\/h[1-6]>/gi, '\n\n');
  t = t.replace(/<\/li>/gi, '\n').replace(/<[^>]+>/g, ' ');
  t = t.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
  t = t.replace(/&quot;/g,'"').replace(/&nbsp;/g,' ').replace(/&#39;/g,"'");
  t = t.replace(/&eacute;/g,'é').replace(/&egrave;/g,'è').replace(/&agrave;/g,'à');
  t = t.replace(/&ccedil;/g,'ç').replace(/&ecirc;/g,'ê').replace(/&#[0-9]+;/g,' ');
  t = t.replace(/[ \t]{2,}/g,' ').replace(/\n{3,}/g,'\n\n').trim();
  if (t.length > 8000) t = t.substring(0, 8000) + '\n[tronque]';
  if (!t || t.length < 20) return '[Contenu non extractible: ' + url + ']';
  return title ? 'Titre: ' + title + '\n\n' + t : t;
}
