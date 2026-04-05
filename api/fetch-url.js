// api/fetch-url.js - Fonction serverless Vercel
const https = require('https');
const http = require('http');
const { URL } = require('url');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });
  const { url, type } = req.body || {};
  if (!url || !url.startsWith('http')) return res.status(400).json({ error: 'URL invalide' });
  if (type === 'image') return res.status(200).json({ content: '[Image]' });
  if (type === 'video') return res.status(200).json({ content: `[Vidéo — URL : ${url}]` });
  try {
    const content = await fetchUrl(url);
    return res.status(200).json({ content });
  } catch (err) {
    return res.status(200).json({ content: `[Erreur — ${url} : ${err.message}]` });
  }
};

function fetchUrl(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) return reject(new Error('Trop de redirections'));
    const parsedUrl = new URL(url);
    const lib = parsedUrl.protocol === 'https:' ? require('https') : require('http');
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      timeout: 12000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DigipadBot/1.0)',
        'Accept': 'text/html,application/xhtml+xml,*/*',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      }
    };
    const req = lib.request(options, (response) => {
      if ([301,302,303,307,308].includes(response.statusCode) && response.headers.location) {
        const newUrl = response.headers.location.startsWith('http')
          ? response.headers.location
          : `${parsedUrl.protocol}//${parsedUrl.hostname}${response.headers.location}`;
        return resolve(fetchUrl(newUrl, redirectCount + 1));
      }
      if (response.statusCode !== 200) return resolve(`[Erreur HTTP ${response.statusCode} — ${url}]`);
      const contentType = response.headers['content-type'] || '';
      if (contentType.includes('application/pdf') || url.toLowerCase().endsWith('.pdf')) {
        return resolve(`[PDF — ${url}]`);
      }
      let data = '';
      response.setEncoding('utf8');
      response.on('data', chunk => { data += chunk; if (data.length > 300000) response.destroy(); });
      response.on('end', () => resolve(extractText(data, url)));
      response.on('error', reject);
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', reject);
    req.end();
  });
}

function extractText(html, url) {
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, ' ')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, ' ')
    .replace(/<form[^>]*>[\s\S]*?<\/form>/gi, ' ')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, ' ');
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/<[^>]*
