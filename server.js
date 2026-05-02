import express from 'express';
import cors from 'cors';
import { randomBytes } from 'crypto';
import fs from 'fs';
import path from 'path';
import { load as cheerioLoad } from 'cheerio';

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_DATA_MB = 100 * 1024; // 100 GB in megabytes
const SERVER_START = Date.now();
const USERS_FILE = path.resolve('users.json');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// --- IP-based user store ---
function loadUsersFromFile() {
  try {
    const raw = fs.readFileSync(USERS_FILE, 'utf-8');
    const data = JSON.parse(raw);
    return new Map(Object.entries(data));
  } catch (err) {
    if (err.code && err.code !== 'ENOENT') {
      console.error('[users] failed to load users.json', err);
    }
    return new Map();
  }
}

function saveUsersToFile() {
  try {
    const data = Object.fromEntries(users.entries());
    fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[users] failed to save users.json', err);
  }
}

const users = loadUsersFromFile();

function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

function getOrCreateUser(ip) {
  let user = users.get(ip);
  if (!user) {
    const rand = () => randomBytes(3).toString('hex').toUpperCase();
    user = {
      ip,
      apiKey: `EPX-${rand()}-${rand()}-${rand()}`,
      dataUsed: 0,
      dataLimit: MAX_DATA_MB,
      requests: 0,
      createdAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
    };
    users.set(ip, user);
    saveUsersToFile();
    return user;
  }

  if (user.dataLimit == null) {
    user.dataLimit = MAX_DATA_MB;
  }
  user.lastSeen = new Date().toISOString();
  saveUsersToFile();
  return user;
}

function getServerUptime() {
  const elapsed = Date.now() - SERVER_START;
  const h = Math.floor(elapsed / 3600000);
  const m = Math.floor((elapsed % 3600000) / 60000);
  const s = Math.floor((elapsed % 60000) / 1000);
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}

function escapeHtml(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderConsoleHtml() {
  const dataLimit = MAX_DATA_MB;
  const userRows = Array.from(users.values())
    .map(user => `
      <tr>
        <td>${escapeHtml(user.ip)}</td>
        <td>${escapeHtml(user.apiKey)}</td>
        <td>${escapeHtml(user.dataUsed.toFixed ? user.dataUsed.toFixed(2) : user.dataUsed)}</td>
        <td>${escapeHtml(user.dataLimit || dataLimit)}</td>
        <td>${escapeHtml(user.requests)}</td>
        <td>${escapeHtml(user.createdAt)}</td>
        <td>${escapeHtml(user.lastSeen)}</td>
      </tr>`)
    .join('') || '<tr><td colspan="7">No users yet</td></tr>';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EasyProxi Console</title>
  <style>
    body { margin: 0; padding: 0; background: #0b0f11; color: #c7f0a6; font-family: 'Ubuntu Mono', 'Fira Mono', 'Source Code Pro', monospace; }
    .terminal { min-height: 100vh; padding: 24px; background: radial-gradient(circle at top, rgba(255,255,255,.05), transparent 25%), #0b0f11; }
    .window { max-width: 1280px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 35px 120px rgba(0,0,0,.45); border: 1px solid rgba(255,255,255,.08); }
    .window-header { display: flex; align-items: center; gap: 10px; padding: 12px 18px; background: linear-gradient(90deg, rgba(255,255,255,.06), rgba(255,255,255,.03)); }
    .window-header .dot { width: 12px; height: 12px; border-radius: 50%; background: #ff5f57; box-shadow: inset 0 0 0 1px rgba(0,0,0,.12); }
    .window-header .dot:nth-child(2) { background: #ffbd2e; }
    .window-header .dot:nth-child(3) { background: #28c840; }
    .window-header .title { color: #d6e9b6; font-size: .95rem; letter-spacing: .04em; }
    .panel { padding: 24px; background: #09100f; }
    .section { margin-bottom: 24px; }
    .section h1, .section h2 { margin: 0 0 12px 0; color: #c7f0a6; }
    .section p { margin: 0 0 16px 0; color: #99c28f; }
    .toolbar { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 10px; }
    .button { background: #15261c; border: 1px solid rgba(135, 211, 124, .12); color: #c7f0a6; border-radius: 8px; padding: 10px 14px; cursor: pointer; }
    .button:hover { background: #1f3c28; }
    table { width: 100%; border-collapse: collapse; font-size: .95rem; }
    th, td { padding: 12px 14px; text-align: left; border-bottom: 1px solid rgba(147, 197, 253, .08); }
    th { color: #9ddc7c; font-weight: 700; }
    tr:hover { background: rgba(157, 220, 124, .08); }
    .small { font-size: 0.85rem; color: #8fae82; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; }
    .stat { background: rgba(255,255,255,.03); border: 1px solid rgba(157,220,124,.12); border-radius: 12px; padding: 16px; }
    .stat strong { display: block; margin-bottom: 8px; color: #9ddc7c; }
    .stat div { color: #e4f7c3; font-size: 1.4rem; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="terminal">
    <div class="window">
      <div class="window-header">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="title">root@easyproxi:~ /console</span>
      </div>
      <div class="panel">
        <div class="section">
          <h1>EasyProxi Console</h1>
          <p class="small">Linux-style monitoring view for proxy users and limits.</p>
          <div class="toolbar">
            <button class="button" onclick="location.reload()">refresh</button>
          </div>
        </div>
        <div class="stats">
          <div class="stat"><strong>total users</strong><div>${users.size}</div></div>
          <div class="stat"><strong>default data limit</strong><div>${dataLimit} MB</div></div>
        </div>
      </div>
    </div>

  <div class="card">
    <h2>Stored Users</h2>
    <div style="overflow-x:auto;">
      <table>
        <thead>
          <tr>
            <th>IP</th>
            <th>API Key</th>
            <th>Used MB</th>
            <th>Limit MB</th>
            <th>Requests</th>
            <th>Created</th>
            <th>Last Seen</th>
          </tr>
        </thead>
        <tbody>
          ${userRows}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
}

app.use((req, res, next) => {
  req.clientIp = getClientIp(req);
  req.clientUser = getOrCreateUser(req.clientIp);
  next();
});

// --- URL rewriting ---
const PROXY_PATH = '/api/proxy?url=';

function resolveUrl(base, relative) {
  try {
    return new URL(relative, base).href;
  } catch {
    return null;
  }
}

function isSkipUrl(url) {
  if (!url) return true;
  const trimmed = url.trim();
  return (
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('javascript:') ||
    trimmed.startsWith('#') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('tel:')
  );
}

function isAlreadyProxied(resolved) {
  return resolved.includes(PROXY_PATH);
}

function rewriteUrl(url, baseUrl) {
  if (!url) return url;
  if (isSkipUrl(url)) return url;
  const resolved = resolveUrl(baseUrl, url);
  if (!resolved) return url;
  if (isAlreadyProxied(resolved)) return url;
  return PROXY_PATH + encodeURIComponent(resolved);
}

function rewriteActionUrl(url, baseUrl) {
  const resolved = resolveUrl(baseUrl, url || '') || baseUrl;
  if (!resolved) return url || baseUrl;
  if (isAlreadyProxied(resolved)) return url || baseUrl;
  return PROXY_PATH + encodeURIComponent(resolved);
}

function rewriteSrcset(srcset, baseUrl) {
  return srcset.replace(/(\S+)(\s+\S+)?/g, (part, url, descriptor) => {
    return rewriteUrl(url, baseUrl) + (descriptor || '');
  });
}

function rewriteStyleUrls(css, baseUrl) {
  return css.replace(/url\(["']?([^\)"']+)["']?\)/gi, (match, url) => {
    return `url("${rewriteUrl(url, baseUrl)}")`;
  });
}

function getNavigationOverrideScript(pageUrl) {
  return `(function() {
  const proxyPrefix = '${PROXY_PATH}';
  const originalPageUrl = ${JSON.stringify(pageUrl)};

  function isProxyTarget(url) {
    try {
      const resolved = new URL(url, originalPageUrl).href;
      return resolved.includes(proxyPrefix) || resolved.startsWith(window.location.origin + proxyPrefix);
    } catch {
      return false;
    }
  }

  function resolveTargetUrl(url) {
    try {
      return new URL(url, originalPageUrl).href;
    } catch {
      return url;
    }
  }

  function proxyUrl(url) {
    if (!url) return url;
    const trimmed = String(url).trim();
    if (trimmed.startsWith('data:') || trimmed.startsWith('blob:') || trimmed.startsWith('javascript:') || trimmed.startsWith('mailto:') || trimmed.startsWith('tel:') || trimmed.startsWith('#')) {
      return trimmed;
    }
    const resolved = resolveTargetUrl(trimmed);
    if (isProxyTarget(resolved)) return resolved;
    return proxyPrefix + encodeURIComponent(resolved);
  }

  const originalFetch = window.fetch.bind(window);
  const originalOpen = window.open.bind(window);
  const originalAssign = window.location.assign.bind(window.location);
  const originalReplace = window.location.replace.bind(window.location);

  window.fetch = function(resource, init) {
    if (typeof resource === 'string') {
      resource = proxyUrl(resource);
    } else if (resource instanceof Request) {
      resource = new Request(proxyUrl(resource.url), resource);
    }
    return originalFetch(resource, init);
  };

  window.open = function(url, target, features) {
    return originalOpen(proxyUrl(url || originalPageUrl), target, features);
  };

  window.location.assign = function(url) {
    return originalAssign(proxyUrl(url));
  };

  window.location.replace = function(url) {
    return originalReplace(proxyUrl(url));
  };

  try {
    Object.defineProperty(window, 'location', {
      configurable: true,
      enumerable: true,
      get() {
        return location;
      },
      set(url) {
        originalAssign(proxyUrl(url));
      }
    });
    Object.defineProperty(document, 'location', {
      configurable: true,
      enumerable: true,
      get() {
        return location;
      },
      set(url) {
        originalAssign(proxyUrl(url));
      }
    });
  } catch (e) {
    // Some browsers do not allow redefining location
  }

  const xhrProto = window.XMLHttpRequest && window.XMLHttpRequest.prototype;
  if (xhrProto) {
    const originalXhrOpen = xhrProto.open;
    xhrProto.open = function(method, url) {
      const args = Array.prototype.slice.call(arguments);
      args[1] = proxyUrl(args[1]);
      return originalXhrOpen.apply(this, args);
    };
  }
})();`;
}

function rewriteHtml(html, baseUrl) {
  const doctypeMatch = html.match(/^\s*<!doctype[^>]*>/i);
  const doctype = doctypeMatch ? doctypeMatch[0] : '';
  const $ = cheerioLoad(html, { decodeEntities: false, lowerCaseAttributeNames: false });
  const baseHref = $('base[href]').first().attr('href');
  const pageBase = resolveUrl(baseUrl, baseHref || '') || baseUrl;

  function rewriteAttr(el, attr, action = false) {
    const current = $(el).attr(attr);
    if (!current) return;
    const rewritten = action ? rewriteActionUrl(current, pageBase) : rewriteUrl(current, pageBase);
    if (rewritten) $(el).attr(attr, rewritten);
  }

  $('[href]').each((i, el) => {
    if (el.tagName === 'base') return;
    rewriteAttr(el, 'href');
  });

  $('[src]').each((i, el) => {
    rewriteAttr(el, 'src');
  });

  $('[srcset]').each((i, el) => {
    const current = $(el).attr('srcset');
    if (!current) return;
    $(el).attr('srcset', rewriteSrcset(current, pageBase));
  });

  $('[action]').each((i, el) => {
    const action = $(el).attr('action') || '';
    $(el).attr('action', rewriteActionUrl(action, pageBase));
  });

  $('[formaction]').each((i, el) => {
    const action = $(el).attr('formaction');
    if (!action) return;
    $(el).attr('formaction', rewriteActionUrl(action, pageBase));
  });

  $('[poster]').each((i, el) => {
    rewriteAttr(el, 'poster');
  });

  $('[data]').each((i, el) => {
    rewriteAttr(el, 'data');
  });

  $('[style]').each((i, el) => {
    const style = $(el).attr('style');
    if (style) {
      $(el).attr('style', rewriteStyleUrls(style, pageBase));
    }
  });

  $('style').each((i, el) => {
    const style = $(el).html();
    if (style) {
      $(el).html(rewriteStyleUrls(style, pageBase));
    }
  });

  $('meta[http-equiv]').each((i, el) => {
    const content = $(el).attr('content');
    if (content) {
      $(el).attr('content', content.replace(/url=([^;]+)/gi, (m, url) => `url=${rewriteUrl(url, pageBase)}`));
    }
  });

  const injectionScript = `<script>${getNavigationOverrideScript(pageBase)}</script>`;
  if ($('head').length) {
    $('head').prepend(injectionScript);
  } else if ($('body').length) {
    $('body').prepend(injectionScript);
  } else {
    $.root().prepend(injectionScript);
  }

  let output = $.html();
  if (doctype && !output.toLowerCase().startsWith('<!doctype')) {
    output = doctype + '\n' + output;
  }
  return output;
}

function rewriteCss(css, baseUrl) {
  return css.replace(/url\(["']?([^\)"']+)["']?\)/gi, (match, url) => {
    return `url("${rewriteUrl(url, baseUrl)}")`;
  });
}

// --- Overlay injected into every proxied HTML page ---
function getOverlaySnippet(user) {
  const uptimeSeconds = Math.floor((Date.now() - SERVER_START) / 1000);
  const dataLimit = user.dataLimit || MAX_DATA_MB;
  const barPct = Math.min(100, (user.dataUsed / dataLimit) * 100).toFixed(1);

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
      <strong id="epx-data">${user.dataUsed.toFixed(2)} MB / ${dataLimit} MB</strong>
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
      if (dataEl) dataEl.textContent = data.dataUsed.toFixed(2) + ' MB / ' + data.dataLimit + ' MB';
      if (reqEl) reqEl.textContent = data.requests;
      if (barEl) barEl.style.width = Math.min(100, (data.dataUsed / data.dataLimit) * 100).toFixed(1) + '%';
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
    dataLimit: user.dataLimit || MAX_DATA_MB,
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
  saveUsersToFile();
  console.log(`[reset] ip=${req.clientIp}`);
  res.json({ success: true });
});

// --- POST /api/usage (legacy) ---
app.post('/api/usage', (req, res) => {
  const user = req.clientUser;
  const { dataUsed, requests } = req.body;
  user.dataUsed = Math.min(MAX_DATA_MB, user.dataUsed + (parseFloat(dataUsed) || 0));
  user.requests += parseInt(requests) || 0;
  saveUsersToFile();
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
      saveUsersToFile();

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
      saveUsersToFile();

      text = rewriteCss(text, url);
      res.status(response.status).send(text);

    } else if (isJs) {
      // Pass JS through as-is (rewriting JS is complex and breaks things)
      const text = await response.text();
      const mb = Buffer.byteLength(text, 'utf8') / (1024 * 1024);
      user.dataUsed = Math.min(MAX_DATA_MB, user.dataUsed + mb);
      user.requests += 1;
      saveUsersToFile();
      res.status(response.status).send(text);

    } else {
      // Images, fonts, etc — pass through as binary
      const buffer = await response.arrayBuffer();
      user.dataUsed = Math.min(MAX_DATA_MB, user.dataUsed + buffer.byteLength / (1024 * 1024));
      user.requests += 1;
      saveUsersToFile();
      res.status(response.status).send(Buffer.from(buffer));
    }

  } catch (err) {
    console.error(`[proxy:error] url=${url} err=${err.message}`);
    res.status(500).send('Proxy error: ' + err.message);
  }
});

// --- Console HTML ---
app.get('/console', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(renderConsoleHtml());
});

// --- Root ---
app.get('/', (req, res) => {
  res.json({ name: 'EasyProxi Server', version: '3.0.0', status: 'online' });
});

app.listen(PORT, () => {
  console.log(`EasyProxi server running on port ${PORT}`);
});