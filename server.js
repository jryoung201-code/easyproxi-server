import express from 'express';
import cors from 'cors';
import { randomBytes } from 'crypto';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// --- In-memory store (resets on restart, good enough for free Render tier) ---
const apiKeys = new Map();    // key -> { id, username, dataUsed, requests, createdAt }
const usageStore = new Map(); // key -> { dataUsed, requests }

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
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    const contentType = response.headers.get('content-type') || 'text/html';
    const data = await response.text();

    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(response.status).send(data);
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
