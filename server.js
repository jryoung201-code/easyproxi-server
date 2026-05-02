import express from 'express';
import cors from 'cors';
import { randomBytes } from 'crypto';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --- In-memory store ---
const apiKeys = new Map();
const usageStore = new Map();

function getOrCreateUser(apiKey) {
  if (!apiKeys.has(apiKey)) {
    apiKeys.set(apiKey, {
      id: `user-${randomBytes(4).toString('hex')}`,
      username: 'easyproxi-user',
      email: 'user@easyproxi.local',
      plan: 'free',
      dataLimit: 500,
      createdAt: new Date().toISOString(),
    });
    usageStore.set(apiKey, { dataUsed: 0, requests: 0 });
  }
  return apiKeys.get(apiKey);
}

function requireApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return res.status(401).json({ error: 'API key required' });
  req.apiKey = apiKey;
  req.user = getOrCreateUser(apiKey);
  next();
}

// --- Overlay HTML/CSS/JS to inject into every proxied page ---
function getOverlaySnippet() {
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
  #epx-overlay .epx-drag {
    font-size: 0.85rem !important;
    color: #94b5d5 !important;
  }
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
    <div class="epx-row"><span>Data Usage</span><strong id="epx-data">-- MB</strong></div>
    <div class="epx-row"><span>Requests</span><strong id="epx-requests">--</strong></div>
    <div class="epx-row"><span>Uptime</span><strong id="epx-uptime">00:00:00</strong></div>
    <div class="epx-row"><span>API Key</span><strong id="epx-key" style="font-size:0.75rem">...</strong></div>
  </div>
  <div class="epx-footer">
    <button id="epx-reset">Reset Session</button>
  </div>
</div>

<script>
(function() {
  const STORAGE_KEY = 'easyproxi-data';
  const API_KEY_KEY = 'easyproxi-api-key';
  const MAX_DATA_MB = 500;
  const SERVER_URL = 'https://server.easyproxi.online';
  const UPTIME_START = Date.now();

  function getOrCreateApiKey() {
    let key = localStorage.getItem(API_KEY_KEY);
    if (!key) {
      const rand = () => Math.random().toString(36).substring(2, 8).toUpperCase();
      key = 'EPX-' + rand() + '-' + rand() + '-' + rand();
      localStorage.setItem(API_KEY_KEY, key);
    }
    return key;
  }

  function loadStats() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : { dataUsed: 0, requests: 0 };
    } catch { return { dataUsed: 0, requests: 0 }; }
  }

  function updatePanel() {
    const stats = loadStats();
    const el = (id) => document.getElementById(id);
    if (el('epx-data')) el('epx-data').textContent = stats.dataUsed.toFixed(2) + ' MB / ' + MAX_DATA_MB + ' MB';
    if (el('epx-requests')) el('epx-requests').textContent = stats.requests;
    if (el('epx-key')) el('epx-key').textContent = getOrCreateApiKey();
  }

  function updateUptime() {
    const el = document.getElementById('epx-uptime');
    if (!el) return;
    const elapsed = Date.now() - UPTIME_START;
    const h = Math.floor(elapsed / 3600000);
    const m = Math.floor((elapsed % 3600000) / 60000);
    const s = Math.floor((elapsed % 60000) / 1000);
    el.textContent = [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
  }

  // Dragging
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
    const x = e.clientX - dragOffset.x;
    const y = e.clientY - dragOffset.y;
    panel.style.left = Math.max(12, Math.min(window.innerWidth - panel.offsetWidth - 12, x)) + 'px';
    panel.style.top = Math.max(12, Math.min(window.innerHeight - panel.offsetHeight - 12, y)) + 'px';
    panel.style.right = 'auto';
  });

  panel.addEventListener('pointerup', function() { isDragging = false; });
  panel.addEventListener('pointercancel', function() { isDragging = false; });

  // Close button
  document.getElementById('epx-close').addEventListener('click', function() {
    panel.style.display = 'none';
  });

  // Reset button
  document.getElementById('epx-reset').addEventListener('click', function() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(API_KEY_KEY);
    updatePanel();
  });

  // Init
  updatePanel();
  setInterval(updateUptime, 1000);
  setInterval(updatePanel, 3000); // Sync stats every 3s in case main app updated them
})();
</script>
`;
}

// --- Inject overlay into HTML responses ---
function injectOverlay(html) {
  const snippet = getOverlaySnippet();
  // Try to inject before </body>, fallback to appending
  if (html.includes('</body>')) {
    return html.replace('</body>', snippet + '</body>');
  }
  return html + snippet;
}

// --- GET /api/status ---
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// --- GET /api/user ---
app.get('/api/user', requireApiKey, (req, res) => {
  res.json(req.user);
});

// --- POST /api/usage ---
app.post('/api/usage', requireApiKey, (req, res) => {
  const { dataUsed, requests } = req.body;
  const current = usageStore.get(req.apiKey) || { dataUsed: 0, requests: 0 };

  usageStore.set(req.apiKey, {
    dataUsed: (current.dataUsed || 0) + (parseFloat(dataUsed) || 0),
    requests: (current.requests || 0) + (parseInt(requests) || 0),
  });

  console.log(`[usage] key=${req.apiKey} dataUsed=${dataUsed}MB requests=${requests}`);
  res.json({ success: true, message: 'Usage tracked', total: usageStore.get(req.apiKey) });
});

// --- GET /api/proxy?url=... ---
app.get('/api/proxy', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send('Missing URL');

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    });

    const contentType = response.headers.get('content-type') || 'text/html';
    const isHtml = contentType.includes('text/html');

    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    // Remove headers that would block injection or cause issues
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('X-Frame-Options');

    if (isHtml) {
      const text = await response.text();
      const injected = injectOverlay(text);
      res.status(response.status).send(injected);
    } else {
      const buffer = await response.arrayBuffer();
      res.status(response.status).send(Buffer.from(buffer));
    }
  } catch (err) {
    res.status(500).send('Proxy error: ' + err.message);
  }
});

// --- Root ---
app.get('/', (req, res) => {
  res.json({ name: 'EasyProxi Server', version: '1.0.0', status: 'online' });
});

app.listen(PORT, () => {
  console.log(`EasyProxi server running on port ${PORT}`);
});