import express from 'express';
import cors from 'cors';
import { randomBytes } from 'crypto';

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_DATA_MB = 500;
const SERVER_START = Date.now();

app.use(cors());
app.use(express.json());

// --- IP-based user store ---
const users = new Map();

function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

function getOrCreateUser(ip) {
  if (!users.has(ip)) {
    const rand = () => randomBytes(3).toString('hex').toUpperCase();
    users.set(ip, {
      ip,
      apiKey: `EPX-${rand()}-${rand()}-${rand()}`,
      dataUsed: 0,
      requests: 0,
      createdAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
    });
  }
  const user = users.get(ip);
  user.lastSeen = new Date().toISOString();
  return user;
}

function getServerUptime() {
  const elapsed = Date.now() - SERVER_START;
  const h = Math.floor(elapsed / 3600000);
  const m = Math.floor((elapsed % 3600000) / 60000);
  const s = Math.floor((elapsed % 60000) / 1000);
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}

app.use((req, res, next) => {
  req.clientIp = getClientIp(req);
  req.clientUser = getOrCreateUser(req.clientIp);
  next();
});

// --- URL rewriting ---
// Rewrites all URLs in HTML/CSS so they route through the proxy
const PROXY_BASE = 'https://server.easyproxi.online/api/proxy?url=';

function resolveUrl(base, relative) {
  try {
    return new URL(relative, base).href;
  } catch {
    return null;
  }
}

function rewriteUrl(url, baseUrl) {
  if (!url) return url;
  url = url.trim();
  if (
    url.startsWith('data:') ||
    url.startsWith('blob:') ||
    url.startsWith('javascript:') ||
    url.startsWith('#') ||
    url.startsWith('mailto:') ||
    url.startsWith('tel:')
  ) return url;

  const resolved = resolveUrl(baseUrl, url);
  if (!resolved) return url;

  // Don't re-proxy already proxied URLs
  if (resolved.startsWith('https://server.easyproxi.online')) return url;

  return PROXY_BASE + encodeURIComponent(resolved);
}

function rewriteHtml(html, baseUrl) {
  // Rewrite href attributes (links, stylesheets)
  html = html.replace(/\s(href)=["']([^"']+)["']/gi, (match, attr, url) => {
    return ` ${attr}="${rewriteUrl(url, baseUrl)}"`;
  });

  // Rewrite src attributes (scripts, images, iframes)
  html = html.replace(/\s(src)=["']([^"']+)["']/gi, (match, attr, url) => {
    return ` ${attr}="${rewriteUrl(url, baseUrl)}"`;
  });

  // Rewrite srcset attributes
  html = html.replace(/\ssrcset=["']([^"']+)["']/gi, (match, srcset) => {
    const rewritten = srcset.replace(/(\S+)(\s+\S+)?/g, (part, url, descriptor) => {
      return rewriteUrl(url, baseUrl) + (descriptor || '');
    });
    return ` srcset="${rewritten}"`;
  });

  // Rewrite action attributes (forms)
  html = html.replace(/\s(action)=["']([^"']+)["']/gi, (match, attr, url) => {
    return ` ${attr}="${rewriteUrl(url, baseUrl)}"`;
  });

  // Rewrite url() in inline styles
  html = html.replace(/url\(["']?([^)"']+)["']?\)/gi, (match, url) => {
    return `url("${rewriteUrl(url, baseUrl)}")`;
  });

  // Rewrite meta refresh
  html = html.replace(/<meta[^>]+http-equiv=["']refresh["'][^>]*>/gi, (tag) => {
    return tag.replace(/url=([^"'\s;]+)/gi, (m, url) => {
      return `url=${rewriteUrl(url, baseUrl)}`;
    });
  });

  // Rewrite window.location and fetch calls in inline scripts
  html = html.replace(/<script([^>]*)>([\s\S]*?)<\/script>/gi, (match, attrs, code) => {
    // Skip external scripts (they have src attr)
    if (/src=/i.test(attrs)) return match;
    code = code
      .replace(/window\.location\.href\s*=\s*["']([^"']+)["']/g, (m, url) => {
        return `window.location.href = "${rewriteUrl(url, baseUrl)}"`;
      })
      .replace(/window\.location\.replace\(["']([^"']+)["']\)/g, (m, url) => {
        return `window.location.replace("${rewriteUrl(url, baseUrl)}")`;
      });
    return `<script${attrs}>${code}</script>`;
  });

  return html;
}

function rewriteCss(css, baseUrl) {
  return css.replace(/url\(["']?([^)"']+)["']?\)/gi, (match, url) => {
    return `url("${rewriteUrl(url, baseUrl)}")`;
  });
}

// --- Overlay injected into every proxied HTML page ---
function getOverlaySnippet(user) {
  const uptimeSeconds = Math.floor((Date.now() - SERVER_START) / 1000);
  const barPct = Math.min(100, (user.dataUsed / MAX_DATA_MB) * 100).toFixed(1);

  return `
<style>
  #epx-overlay {
    position: fixed !important;
    top: 20px !important;
    right: 20px !important;
    width: min(340px, calc(100vw - 40px)) !important;
    border-radius: 26px !important;
    background: rgba(20, 25, 40, 0.95) !important;
    border: 1px solid rgba(45, 196, 255, 0.18) !important;
    box-shadow: 0 32px 80px rgba(19, 97, 200, 0.28) !important;
    backdrop-filter: blur(24px) !important;
    z-index: 2147483647 !important;
    cursor: grab !important;
    user-select: none !important;
    font-family: 'Inter', system-ui, sans-serif !important;
    color: #e7f2ff !important;
    font-size: 14px !important;
  }
  #epx-overlay:active { cursor: grabbing !important; }
  #epx-overlay .epx-header {
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    padding: 18px 20px !important;
    border-bottom: 1px solid rgba(255,255,255,0.06) !important;
    color: #d9f2ff !important;
    font-weight: 600 !important;
  }
  #epx-overlay .epx-drag { font-size: 0.85rem !important; color: #94b5d5 !important; }
  #epx-overlay .epx-body { padding: 20px !important; }
  #epx-overlay .epx-row {
    display: flex !important;
    justify-content: space-between !important;
    align-items: center !important;
    padding: 12px 0 !important;
    border-bottom: 1px solid rgba(255,255,255,0.06) !important;
  }
  #epx-overlay .epx-row:last-child { border-bottom: none !important; }
  #epx-overlay .epx-row span { color: #94b5d5 !important; }
  #epx-overlay .epx-row strong { color: #f5fbff !important; }
  #epx-overlay .epx-footer { padding: 16px 20px 20px !important; }
  #epx-reset {
    width: 100% !important;
    padding: 12px 18px !important;
    border: none !important;
    border-radius: 14px !important;
    background: rgba(45, 196, 255, 0.15) !important;
    color: #d7f3ff !important;
    cursor: pointer !important;
    font-size: 0.9rem !important;
  }
  #epx-reset:hover { background: rgba(45, 196, 255, 0.26) !important; }
  #epx-close {
    background: none !important;
    border: none !important;
    color: #94b5d5 !important;
    cursor: pointer !important;
    font-size: 1.1rem !important;
    padding: 0 0 0 10px !important;
    line-height: 1 !important;
  }
  #epx-bar-bg {
    width: 100% !important;
    height: 6px !important;
    background: rgba(255,255,255,0.08) !important;
    border-radius: 99px !important;
    margin-top: 6px !important;
    overflow: hidden !important;
  }
  #epx-bar-fill {
    height: 100% !important;
    border-radius: 99px !important;
    background: linear-gradient(90deg, #2dc4ff, #3c80ff) !important;
    transition: width 0.4s ease !important;
  }
</style>

<div id="epx-overlay">
  <div class="epx-header">
    <span>EasyProxi</span>
    <div style="display:flex;align-items:center;gap:8px">
      <span class="epx-drag">drag</span>
      <button id="epx-close" title="Close">✕</button>
    </div>
  </div>
  <div class="epx-body">
    <div class="epx-row">
      <span>Data Usage</span>
      <strong id="epx-data">${user.dataUsed.toFixed(2)} MB / ${MAX_DATA_MB} MB</strong>
    </div>
    <div style="padding:0 0 12px;border-bottom:1px solid rgba(255,255,255,0.06)">
      <div id="epx-bar-bg"><div id="epx-bar-fill" style="width:${barPct}%"></div></div>
    </div>
    <div class="epx-row"><span>Requests</span><strong id="epx-requests">${user.requests}</strong></div>
    <div class="epx-row"><span>Server Uptime</span><strong id="epx-uptime">00:00:00</strong></div>
    <div class="epx-row"><span>API Key</span><strong id="epx-key" style="font-size:0.75rem;word-break:break-all">${user.apiKey}</strong></div>
  </div>
  <div class="epx-footer">
    <button id="epx-reset">Reset Session</button>
  </div>
</div>

<script>
(function() {
  const SERVER_URL = 'https://server.easyproxi.online';
  const MAX_DATA_MB = ${MAX_DATA_MB};
  const UPTIME_OFFSET = ${uptimeSeconds};
  const PANEL_START = Date.now();

  function updateUptime() {
    const el = document.getElementById('epx-uptime');
    if (!el) return;
    const total = UPTIME_OFFSET + Math.floor((Date.now() - PANEL_START) / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    el.textContent = [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
  }

  async function syncStats() {
    try {
      const res = await fetch(SERVER_URL + '/api/me');
      if (!res.ok) return;
      const data = await res.json();
      const dataEl = document.getElementById('epx-data');
      const reqEl = document.getElementById('epx-requests');
      const barEl = document.getElementById('epx-bar-fill');
      if (dataEl) dataEl.textContent = data.dataUsed.toFixed(2) + ' MB / ' + MAX_DATA_MB + ' MB';
      if (reqEl) reqEl.textContent = data.requests;
      if (barEl) barEl.style.width = Math.min(100, (data.dataUsed / MAX_DATA_MB) * 100).toFixed(1) + '%';
    } catch {}
  }

  const panel = document.getElementById('epx-overlay');
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };

  panel.addEventListener('pointerdown', function(e) {
    if (e.target.id === 'epx-reset' || e.target.id === 'epx-close') return;
    isDragging = true;
    panel.setPointerCapture(e.pointerId);
    const rect = panel.getBoundingClientRect();
    dragOffset.x = e.clientX - rect.left;
    dragOffset.y = e.clientY - rect.top;
  });
  panel.addEventListener('pointermove', function(e) {
    if (!isDragging) return;
    panel.style.left = Math.max(12, Math.min(window.innerWidth - panel.offsetWidth - 12, e.clientX - dragOffset.x)) + 'px';
    panel.style.top = Math.max(12, Math.min(window.innerHeight - panel.offsetHeight - 12, e.clientY - dragOffset.y)) + 'px';
    panel.style.right = 'auto';
  });
  panel.addEventListener('pointerup', function() { isDragging = false; });
  panel.addEventListener('pointercancel', function() { isDragging = false; });

  document.getElementById('epx-close').addEventListener('click', function() {
    panel.style.display = 'none';
  });

  document.getElementById('epx-reset').addEventListener('click', async function() {
    try {
      await fetch(SERVER_URL + '/api/reset', { method: 'POST' });
      await syncStats();
    } catch {}
  });

  setInterval(updateUptime, 1000);
  setInterval(syncStats, 5000);
  updateUptime();
  syncStats();
})();
</script>
`;
}

function injectOverlay(html, user) {
  const snippet = getOverlaySnippet(user);
  if (html.includes('</body>')) {
    return html.replace('</body>', snippet + '</body>');
  }
  return html + snippet;
}

// --- GET /api/status ---
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    uptime: getServerUptime(),
    uptimeSeconds: Math.floor((Date.now() - SERVER_START) / 1000),
    timestamp: new Date().toISOString(),
    totalUsers: users.size,
  });
});

// --- GET /api/me ---
app.get('/api/me', (req, res) => {
  const user = req.clientUser;
  res.json({
    apiKey: user.apiKey,
    dataUsed: user.dataUsed,
    dataLimit: MAX_DATA_MB,
    requests: user.requests,
    uptime: getServerUptime(),
    uptimeSeconds: Math.floor((Date.now() - SERVER_START) / 1000),
    createdAt: user.createdAt,
    lastSeen: user.lastSeen,
  });
});

// --- POST /api/reset ---
app.post('/api/reset', (req, res) => {
  const user = req.clientUser;
  user.dataUsed = 0;
  user.requests = 0;
  console.log(`[reset] ip=${req.clientIp}`);
  res.json({ success: true });
});

// --- POST /api/usage (legacy) ---
app.post('/api/usage', (req, res) => {
  const user = req.clientUser;
  const { dataUsed, requests } = req.body;
  user.dataUsed = Math.min(MAX_DATA_MB, user.dataUsed + (parseFloat(dataUsed) || 0));
  user.requests += parseInt(requests) || 0;
  res.json({ success: true, total: { dataUsed: user.dataUsed, requests: user.requests } });
});

// --- GET /api/proxy?url=... ---
app.get('/api/proxy', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send('Missing URL');

  const user = req.clientUser;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'identity',
      },
      redirect: 'follow',
    });

    const contentType = response.headers.get('content-type') || 'text/html';
    const isHtml = contentType.includes('text/html');
    const isCss = contentType.includes('text/css');
    const isJs = contentType.includes('javascript');

    // Strip security headers that block proxying
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('X-Frame-Options');
    res.removeHeader('X-Content-Type-Options');
    res.setHeader('Content-Type', contentType);

    if (isHtml) {
      let text = await response.text();
      const mb = Buffer.byteLength(text, 'utf8') / (1024 * 1024);

      user.dataUsed = Math.min(MAX_DATA_MB, user.dataUsed + mb);
      user.requests += 1;

      console.log(`[proxy:html] ip=${req.clientIp} url=${url} size=${mb.toFixed(3)}MB total=${user.dataUsed.toFixed(2)}MB`);

      // Rewrite all links/assets then inject overlay
      text = rewriteHtml(text, url);
      text = injectOverlay(text, user);

      res.status(response.status).send(text);

    } else if (isCss) {
      let text = await response.text();
      const mb = Buffer.byteLength(text, 'utf8') / (1024 * 1024);
      user.dataUsed = Math.min(MAX_DATA_MB, user.dataUsed + mb);
      user.requests += 1;

      text = rewriteCss(text, url);
      res.status(response.status).send(text);

    } else if (isJs) {
      // Pass JS through as-is (rewriting JS is complex and breaks things)
      const text = await response.text();
      const mb = Buffer.byteLength(text, 'utf8') / (1024 * 1024);
      user.dataUsed = Math.min(MAX_DATA_MB, user.dataUsed + mb);
      user.requests += 1;
      res.status(response.status).send(text);

    } else {
      // Images, fonts, etc — pass through as binary
      const buffer = await response.arrayBuffer();
      user.dataUsed = Math.min(MAX_DATA_MB, user.dataUsed + buffer.byteLength / (1024 * 1024));
      user.requests += 1;
      res.status(response.status).send(Buffer.from(buffer));
    }

  } catch (err) {
    console.error(`[proxy:error] url=${url} err=${err.message}`);
    res.status(500).send('Proxy error: ' + err.message);
  }
});

// --- Root ---
app.get('/', (req, res) => {
  res.json({ name: 'EasyProxi Server', version: '3.0.0', status: 'online' });
});

app.listen(PORT, () => {
  console.log(`EasyProxi server running on port ${PORT}`);
});