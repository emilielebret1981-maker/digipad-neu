const https = require('https');
const http = require('http');
const { URL } = require('url');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'not allowed' });

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

  if (!url || !url.startsWith('http')) {
    return res.status(200).json({ content: '[URL invalide]' });
  }
  if (type === 'image') return res.status(200).json({ content: '[Image]' });
  if (type === 'video') return res.status(200).json({ content: '[Video: ' + url + ']' });

  try {
    const content = await doFetch(url, 0);
    return res.status(200).json({ content: content });
  } catch(err) {
    return res.status(200).json({ content: '[Erreur: ' + err.message + ']' });
  }
};

function doFetch(url, redirects) {
  return new Promise(function(resolve, reject) {
    if (redirects > 5) return reject(new Error('too many redirects'));
    var parsed;
    try { parsed = new URL(url); } catch(e) { return resolve('[URL invalide: ' + url + ']'); }
    var lib = parsed.protocol === 'https:' ? https : http;
    var opts = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      timeout: 12000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        'Accept': 'text/html,*/*',
        'Accept-Language': 'fr-FR,fr;q=0.9'
      }
    };
    var req = lib.request(opts, function(res) {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        var next = res.headers.location.startsWith('http')
          ? res.headers.location
          : parsed.protocol + '//' + parsed.hostname + res.headers.location;
        return resolve(doFetch(next, redirects + 1));
      }
      if (res.statusCode !== 200) return resolve('[HTTP ' + res.statusCode + ': ' + url + ']');
      var ct = res.headers['content-type'] || '';
      if (ct.indexOf('pdf') > -1 || url.toLowerCase().indexOf('.pdf') > -1) {
        return resolve('[PDF: ' + url + ']');
      }
      var data = '';
      res.setEncoding('utf8');
      res.on('data', function(chunk) {
        data += chunk;
        if (data.length > 200000) res.destroy();
      });
      res.on('end', function() { resolve(cleanHtml(data, url)); });
      res.on('error', reject);
    });
    req.on('timeout', function() { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
    req.end();
  });
}

function cleanHtml(html, url) {
  var t = html;
  t = t.replace(/[\s\S]*?<\/script>/gi, ' ');
  t = t.replace(/[\s\S]*?<\/style>/gi, ' ');
  t = t.replace(/[\s\S]*?<\/nav>/gi, ' ');
  t = t.replace(/[\s\S]*?<\/header>/gi, ' ');
  t = t.replace(/[\s\S]*?<\/footer>/gi, ' ');
  t = t.replace(/[\s\S]*?<\/aside>/gi, ' ');
  t = t.replace(/[\s\S]*?<\/form>/gi, ' ');
  var tm = html.match(/]*>([\s\S]*?)<\/title>/i);
  var title = tm ? tm[1].replace(/<[^>]+>/g, '').trim() : '';
  t = t.replace(/<br[^>]*>/gi, '\n');
  t = t.replace(/<\/p>/gi, '\n\n');
  t = t.replace(/<\/div>/gi, '\n');
  t = t.replace(/<[^>]+>/g, ' ');
  t = t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  t = t.replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ');
  t = t.replace(/&eacute;/g, 'e').replace(/&egrave;/g, 'e').replace(/&agrave;/g, 'a');
  t = t.replace(/&#[0-9]+;/g, ' ');
  t = t.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  if (t.length > 8000) t = t.substring(0, 8000) + '\n[tronque]';
  if (!t || t.length < 20) return '[vide: ' + url + ']';
  return title ? 'Titre: ' + title + '\n\n' + t : t;
}
