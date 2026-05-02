import express from 'express';
import cors from 'cors';
import { randomBytes } from 'crypto';

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_DATA_MB = 500;
const SERVER_START = Date.now();

<<<<<<< HEAD
app.use(cors());
=======
// --- CORS: allow credentials from frontend domains ---
app.use(cors({
  origin: [
    'https://proxy.easyproxi.online',
    'https://browser.easyproxi.online',
    'https://easyproxi.online',
  ],
  credentials: true,
}));

// --- Session: secure cross-origin cookie ---
app.use(session({
  secret: 'easyproxi-secret-key-change-this-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,       // required for cross-origin cookies
    sameSite: 'none',   // required for cross-origin cookies
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  }
}));

>>>>>>> 2aea1d4 (change server.js to add a new route for handling user login requests. The new route will be '/login' and will accept POST requests. The route will validate the user's credentials and return a success message if the credentials are valid, or an error message if they are not. Additionally, we will implement basic error handling for any issues that may arise during the login process.)
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

<<<<<<< HEAD
=======
function authenticateUser(username, password) {
  const user = users.get(username);
  if (!user) return null;
  if (bcrypt.compareSync(password, user.passwordHash)) {
    user.lastSeen = new Date().toISOString();
    saveUsersToFile();
    return user;
  }
  return null;
}

const users = loadUsersFromFile();

// --- Auth middleware ---
// For API routes: return 401 JSON (not redirect)
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

// For console/browser routes: redirect to login
function requireAuthRedirect(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  next();
}

>>>>>>> 2aea1d4 (change server.js to add a new route for handling user login requests. The new route will be '/login' and will accept POST requests. The route will validate the user's credentials and return a success message if the credentials are valid, or an error message if they are not. Additionally, we will implement basic error handling for any issues that may arise during the login process.)
function getServerUptime() {
  const elapsed = Date.now() - SERVER_START;
  const h = Math.floor(elapsed / 3600000);
  const m = Math.floor((elapsed % 3600000) / 60000);
  const s = Math.floor((elapsed % 60000) / 1000);
  return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
}

<<<<<<< HEAD
app.use((req, res, next) => {
  req.clientIp = getClientIp(req);
  req.clientUser = getOrCreateUser(req.clientIp);
  next();
});
=======
function escapeHtml(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderConsoleHtml(req) {
  const dataLimit = MAX_DATA_MB;
  const msg = req.query.msg ? `<p style="color: yellow;">${escapeHtml(req.query.msg)}</p>` : '';
  const userRows = Array.from(users.values())
    .map(user => `
      <tr>
        <td>${escapeHtml(user.username)}</td>
        <td>${escapeHtml(user.dataUsed.toFixed ? user.dataUsed.toFixed(2) : user.dataUsed)}</td>
        <td>${escapeHtml(user.dataLimit || dataLimit)}</td>
        <td>${escapeHtml(user.requests)}</td>
        <td>${escapeHtml(user.createdAt)}</td>
        <td>${escapeHtml(user.lastSeen)}</td>
      </tr>`)
    .join('') || '<tr><td colspan="6">No users yet</td></tr>';

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
    .button { background: #15261c; border: 1px solid rgba(135, 211, 124, .12); color: #c7f0a6; border-radius: 8px; padding: 10px 14px; cursor: pointer; font-family: inherit; }
    .button:hover { background: #1f3c28; }
    table { width: 100%; border-collapse: collapse; font-size: .95rem; }
    th, td { padding: 12px 14px; text-align: left; border-bottom: 1px solid rgba(147, 197, 253, .08); }
    th { color: #9ddc7c; font-weight: 700; }
    tr:hover { background: rgba(157, 220, 124, .08); }
    .small { font-size: 0.85rem; color: #8fae82; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 24px; }
    .stat { background: rgba(255,255,255,.03); border: 1px solid rgba(157,220,124,.12); border-radius: 12px; padding: 16px; }
    .stat strong { display: block; margin-bottom: 8px; color: #9ddc7c; }
    .stat div { color: #e4f7c3; font-size: 1.4rem; margin-top: 4px; }
    .card { max-width: 1280px; margin: 24px auto; padding: 24px; background: #09100f; border-radius: 12px; border: 1px solid rgba(255,255,255,.08); overflow-x: auto; }
    .cmd-input { background: #15261c; border: 1px solid rgba(135, 211, 124, .12); color: #c7f0a6; border-radius: 8px; padding: 10px; width: 100%; font-family: inherit; margin-bottom: 8px; }
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
          <p>Logged in as: <strong>${escapeHtml(req.session.user)}</strong> &nbsp;|&nbsp; Server uptime: <strong>${getServerUptime()}</strong></p>
          ${msg}
          <div class="toolbar">
            <button class="button" onclick="location.reload()">refresh</button>
            <form method="POST" action="/logout" style="display:inline;">
              <button type="submit" class="button">logout</button>
            </form>
          </div>
        </div>
        <div class="stats">
          <div class="stat"><strong>total users</strong><div>${users.size}</div></div>
          <div class="stat"><strong>server uptime</strong><div>${getServerUptime()}</div></div>
          <div class="stat"><strong>default limit</strong><div>${dataLimit} MB</div></div>
        </div>
      </div>
    </div>

    <div class="card">
      <h2>Stored Users</h2>
      <div style="overflow-x:auto;">
        <table>
          <thead>
            <tr>
              <th>Username</th>
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

    <div class="card">
      <h2>Command Line</h2>
      <form method="POST" action="/console">
        <input type="text" name="command" class="cmd-input" placeholder="Enter command..." />
        <button type="submit" class="button">Execute</button>
      </form>
      <p class="small">Commands: list &nbsp;|&nbsp; add &lt;username&gt; &lt;password&gt; &lt;limit&gt; &nbsp;|&nbsp; set &lt;username&gt; limit &lt;limit&gt; &nbsp;|&nbsp; delete &lt;username&gt; &nbsp;|&nbsp; reset &lt;username&gt;</p>
    </div>
  </div>
</body>
</html>`;
}
>>>>>>> 2aea1d4 (change server.js to add a new route for handling user login requests. The new route will be '/login' and will accept POST requests. The route will validate the user's credentials and return a success message if the credentials are valid, or an error message if they are not. Additionally, we will implement basic error handling for any issues that may arise during the login process.)

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

<<<<<<< HEAD
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
=======
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
    } catch { return false; }
  }

  function resolveTargetUrl(url) {
    try { return new URL(url, originalPageUrl).href; } catch { return url; }
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
    if (typeof resource === 'string') resource = proxyUrl(resource);
    else if (resource instanceof Request) resource = new Request(proxyUrl(resource.url), resource);
    return originalFetch(resource, init);
  };

  window.open = function(url, target, features) {
    return originalOpen(proxyUrl(url || originalPageUrl), target, features);
  };

  window.location.assign = function(url) { return originalAssign(proxyUrl(url)); };
  window.location.replace = function(url) { return originalReplace(proxyUrl(url)); };

  try {
    Object.defineProperty(window, 'location', {
      configurable: true, enumerable: true,
      get() { return location; },
      set(url) { originalAssign(proxyUrl(url)); }
    });
    Object.defineProperty(document, 'location', {
      configurable: true, enumerable: true,
      get() { return location; },
      set(url) { originalAssign(proxyUrl(url)); }
    });
  } catch (e) {}

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

  $('[href]').each((i, el) => { if (el.tagName !== 'base') rewriteAttr(el, 'href'); });
  $('[src]').each((i, el) => { rewriteAttr(el, 'src'); });
  $('[srcset]').each((i, el) => {
    const current = $(el).attr('srcset');
    if (current) $(el).attr('srcset', rewriteSrcset(current, pageBase));
  });
  $('[action]').each((i, el) => {
    $(el).attr('action', rewriteActionUrl($(el).attr('action') || '', pageBase));
  });
  $('[formaction]').each((i, el) => {
    const action = $(el).attr('formaction');
    if (action) $(el).attr('formaction', rewriteActionUrl(action, pageBase));
  });
  $('[poster]').each((i, el) => { rewriteAttr(el, 'poster'); });
  $('[data]').each((i, el) => { rewriteAttr(el, 'data'); });
  $('[style]').each((i, el) => {
    const style = $(el).attr('style');
    if (style) $(el).attr('style', rewriteStyleUrls(style, pageBase));
  });
  $('style').each((i, el) => {
    const style = $(el).html();
    if (style) $(el).html(rewriteStyleUrls(style, pageBase));
  });
  $('meta[http-equiv]').each((i, el) => {
    const content = $(el).attr('content');
    if (content) $(el).attr('content', content.replace(/url=([^;]+)/gi, (m, url) => `url=${rewriteUrl(url, pageBase)}`));
  });

  const injectionScript = `<script>${getNavigationOverrideScript(pageBase)}</script>`;
  if ($('head').length) $('head').prepend(injectionScript);
  else if ($('body').length) $('body').prepend(injectionScript);
  else $.root().prepend(injectionScript);

  let output = $.html();
  if (doctype && !output.toLowerCase().startsWith('<!doctype')) output = doctype + '\n' + output;
  return output;
>>>>>>> 2aea1d4 (change server.js to add a new route for handling user login requests. The new route will be '/login' and will accept POST requests. The route will validate the user's credentials and return a success message if the credentials are valid, or an error message if they are not. Additionally, we will implement basic error handling for any issues that may arise during the login process.)
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
    <div class="epx-row"><span>Account</span><strong id="epx-key" style="font-size:0.85rem">${escapeHtml(user.username)}</strong></div>
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
      const res = await fetch(SERVER_URL + '/api/me', { credentials: 'include' });
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
      await fetch(SERVER_URL + '/api/reset', { method: 'POST', credentials: 'include' });
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
  if (html.includes('</body>')) return html.replace('</body>', snippet + '</body>');
  return html + snippet;
}

// ================================================================
// ROUTES
// ================================================================

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
<<<<<<< HEAD
app.get('/api/me', (req, res) => {
  const user = req.clientUser;
=======
app.get('/api/me', requireAuth, (req, res) => {
  const user = getUser(req.session.user);
  if (!user) return res.status(404).json({ error: 'User not found' });
>>>>>>> 2aea1d4 (change server.js to add a new route for handling user login requests. The new route will be '/login' and will accept POST requests. The route will validate the user's credentials and return a success message if the credentials are valid, or an error message if they are not. Additionally, we will implement basic error handling for any issues that may arise during the login process.)
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

<<<<<<< HEAD
  const user = req.clientUser;
=======
  const user = getUser(req.session.user);
  const limit = user.dataLimit || MAX_DATA_MB;
  if (user.dataUsed >= limit) {
    return res.status(429).send(`
      <!doctype html><html>
      <head><title>Data Limit Exceeded</title></head>
      <body style="font-family:sans-serif;background:#02050a;color:#e7f2ff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">
        <div style="text-align:center;padding:40px">
          <h1 style="color:#ff6b6b">Data Limit Exceeded</h1>
          <p>You have used ${user.dataUsed.toFixed(2)} MB out of ${limit} MB.</p>
          <p>Please reset your usage or contact admin.</p>
          <a href="${'https://server.easyproxi.online'}/console" style="color:#2dc4ff">Go to Console</a>
        </div>
      </body></html>
    `);
  }
>>>>>>> 2aea1d4 (change server.js to add a new route for handling user login requests. The new route will be '/login' and will accept POST requests. The route will validate the user's credentials and return a success message if the credentials are valid, or an error message if they are not. Additionally, we will implement basic error handling for any issues that may arise during the login process.)

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

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('X-Frame-Options');
    res.removeHeader('X-Content-Type-Options');
    res.setHeader('Content-Type', contentType);

    if (isHtml) {
      let text = await response.text();
      const mb = Buffer.byteLength(text, 'utf8') / (1024 * 1024);
      user.dataUsed = Math.min(limit, user.dataUsed + mb);
      user.requests += 1;
<<<<<<< HEAD

      console.log(`[proxy:html] ip=${req.clientIp} url=${url} size=${mb.toFixed(3)}MB total=${user.dataUsed.toFixed(2)}MB`);

      // Rewrite all links/assets then inject overlay
=======
      saveUsersToFile();
      console.log(`[proxy:html] user=${req.session.user} url=${url} size=${mb.toFixed(3)}MB total=${user.dataUsed.toFixed(2)}MB`);
>>>>>>> 2aea1d4 (change server.js to add a new route for handling user login requests. The new route will be '/login' and will accept POST requests. The route will validate the user's credentials and return a success message if the credentials are valid, or an error message if they are not. Additionally, we will implement basic error handling for any issues that may arise during the login process.)
      text = rewriteHtml(text, url);
      text = injectOverlay(text, user);
      res.status(response.status).send(text);

    } else if (isCss) {
      let text = await response.text();
      const mb = Buffer.byteLength(text, 'utf8') / (1024 * 1024);
      user.dataUsed = Math.min(limit, user.dataUsed + mb);
      user.requests += 1;
<<<<<<< HEAD

      text = rewriteCss(text, url);
      res.status(response.status).send(text);

    } else if (isJs) {
      // Pass JS through as-is (rewriting JS is complex and breaks things)
      const text = await response.text();
      const mb = Buffer.byteLength(text, 'utf8') / (1024 * 1024);
      user.dataUsed = Math.min(MAX_DATA_MB, user.dataUsed + mb);
      user.requests += 1;
      res.status(response.status).send(text);

=======
      saveUsersToFile();
      text = rewriteCss(text, url);
      res.status(response.status).send(text);

>>>>>>> 2aea1d4 (change server.js to add a new route for handling user login requests. The new route will be '/login' and will accept POST requests. The route will validate the user's credentials and return a success message if the credentials are valid, or an error message if they are not. Additionally, we will implement basic error handling for any issues that may arise during the login process.)
    } else {
      const buffer = await response.arrayBuffer();
      user.dataUsed = Math.min(limit, user.dataUsed + buffer.byteLength / (1024 * 1024));
      user.requests += 1;
      res.status(response.status).send(Buffer.from(buffer));
    }

  } catch (err) {
    console.error(`[proxy:error] url=${url} err=${err.message}`);
    res.status(500).send('Proxy error: ' + err.message);
  }
});

<<<<<<< HEAD
=======
// --- Console ---
app.get('/console', requireAuthRedirect, (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(renderConsoleHtml(req));
});

app.post('/console', requireAuthRedirect, (req, res) => {
  const cmd = req.body.command?.trim();
  if (!cmd) return res.redirect('/console?msg=Empty command');
  const parts = cmd.split(/\s+/);
  const action = parts[0].toLowerCase();
  let msg = '';
  try {
    if (action === 'list') {
      msg = 'Users listed above';
    } else if (action === 'add' && parts.length >= 4) {
      const username = parts[1];
      const password = parts[2];
      const limit = parseInt(parts[3]);
      if (!username || !password || isNaN(limit)) throw new Error('Invalid username, password or limit');
      if (users.has(username)) throw new Error('User already exists');
      const user = createUser(username, password);
      user.dataLimit = limit;
      saveUsersToFile();
      msg = `User ${username} added with limit ${limit} MB`;
    } else if (action === 'set' && parts[1] && parts[2] === 'limit' && parts.length >= 4) {
      const username = parts[1];
      const limit = parseInt(parts[3]);
      const user = users.get(username);
      if (!user) throw new Error('User not found');
      user.dataLimit = limit;
      saveUsersToFile();
      msg = `Limit for ${username} set to ${limit} MB`;
    } else if (action === 'delete' && parts.length >= 2) {
      const username = parts[1];
      if (users.delete(username)) { saveUsersToFile(); msg = `User ${username} deleted`; }
      else msg = `User ${username} not found`;
    } else if (action === 'reset' && parts.length >= 2) {
      const username = parts[1];
      const user = users.get(username);
      if (!user) throw new Error('User not found');
      user.dataUsed = 0;
      saveUsersToFile();
      msg = `Data usage for ${username} reset to 0`;
    } else {
      throw new Error('Unknown command. Use: list, add &lt;username&gt; &lt;password&gt; &lt;limit&gt;, set &lt;username&gt; limit &lt;limit&gt;, delete &lt;username&gt;, reset &lt;username&gt;');
    }
  } catch (e) {
    msg = 'Error: ' + e.message;
  }
  res.redirect('/console?msg=' + encodeURIComponent(msg));
});

// --- Auth routes: support both JSON (from frontend) and form POST ---
app.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/console');
  res.redirect('https://proxy.easyproxi.online/register');
});

app.post('/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).send('Missing fields');
  if (users.has(username)) return res.status(409).send('Username already taken');
  createUser(username, password);
  req.session.user = username;
  // Return JSON if requested by frontend, otherwise redirect
  if (req.headers['content-type']?.includes('application/json')) {
    return res.json({ success: true });
  }
  res.redirect('/console');
});

app.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/console');
  res.redirect('https://proxy.easyproxi.online/login');
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = authenticateUser(username, password);
  if (!user) return res.status(401).send('Invalid username or password');
  req.session.user = username;
  // Return JSON if requested by frontend, otherwise redirect
  if (req.headers['content-type']?.includes('application/json')) {
    return res.json({ success: true });
  }
  res.redirect('/console');
});

app.post('/logout', (req, res) => {
  req.session.destroy();
  if (req.headers['content-type']?.includes('application/json')) {
    return res.json({ success: true });
  }
  res.redirect('https://proxy.easyproxi.online/login');
});

>>>>>>> 2aea1d4 (change server.js to add a new route for handling user login requests. The new route will be '/login' and will accept POST requests. The route will validate the user's credentials and return a success message if the credentials are valid, or an error message if they are not. Additionally, we will implement basic error handling for any issues that may arise during the login process.)
// --- Root ---
app.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/console');
  res.redirect('https://proxy.easyproxi.online/login');
});

app.listen(PORT, () => {
  console.log(`EasyProxi server running on port ${PORT}`);
});
