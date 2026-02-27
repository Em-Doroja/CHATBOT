const express = require('express');
const path = require('path');
const https = require('https'); // ✅ Built-in Node.js — works on ALL versions, no install needed

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── HEALTH CHECK ──
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    apiKeyLoaded: !!process.env.ANTHROPIC_API_KEY,
    nodeVersion: process.version,
    timestamp: new Date().toISOString()
  });
});

// ── CHAT API ROUTE ──
app.post('/api/chat', (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error('[ERROR] ANTHROPIC_API_KEY not set');
    return res.status(500).json({ error: { message: 'API key not configured on server.' } });
  }

  const { model, max_tokens, system, messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: { message: 'Invalid request: messages array required.' } });
  }

  const bodyData = JSON.stringify({
    model: model || 'claude-haiku-4-5-20251001',
    max_tokens: max_tokens || 1000,
    system: system || '',
    messages: messages
  });

  const options = {
    hostname: 'api.anthropic.com',
    path: '/v1/messages',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(bodyData),
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    }
  };

  console.log(`[CHAT] Sending to Anthropic | model=${options.body} | msgs=${messages.length}`);

  const request = https.request(options, (response) => {
    let rawData = '';
    response.on('data', (chunk) => { rawData += chunk; });
    response.on('end', () => {
      try {
        const parsed = JSON.parse(rawData);
        if (response.statusCode !== 200) {
          console.error(`[ANTHROPIC ERROR] ${response.statusCode}:`, rawData);
        } else {
          console.log(`[CHAT] Success | output_tokens=${parsed.usage?.output_tokens}`);
        }
        res.status(response.statusCode).json(parsed);
      } catch (e) {
        console.error('[PARSE ERROR]', e.message, rawData);
        res.status(500).json({ error: { message: 'Failed to parse Anthropic response.' } });
      }
    });
  });

  request.on('error', (err) => {
    console.error('[REQUEST ERROR]', err.message);
    res.status(500).json({ error: { message: 'Network error: ' + err.message } });
  });

  request.write(bodyData);
  request.end();
});

// ── FALLBACK ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ RBCCI Chatbot running on port ${PORT}`);
  console.log(`🔑 API Key: ${process.env.ANTHROPIC_API_KEY ? 'LOADED ✓' : 'MISSING ✗'}`);
  console.log(`📦 Node version: ${process.version}`);
});
