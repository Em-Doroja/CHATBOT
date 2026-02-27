const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ── MIDDLEWARE ──
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── HEALTH CHECK (visit /health to confirm server + API key status) ──
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    apiKeyLoaded: !!process.env.ANTHROPIC_API_KEY,
    timestamp: new Date().toISOString()
  });
});

// ── CHAT API ROUTE ──
app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // Guard: no API key
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY is not set!');
    return res.status(500).json({
      error: { message: 'Server error: API key not configured.' }
    });
  }

  const { model, max_tokens, system, messages } = req.body;

  // Guard: bad request body
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({
      error: { message: 'Invalid request: messages array is required.' }
    });
  }

  try {
    console.log(`[CHAT] Calling Anthropic | model=${model} | messages=${messages.length}`);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,              // ✅ Correct Anthropic auth
        'anthropic-version': '2023-06-01' // ✅ Required by Anthropic
      },
      body: JSON.stringify({
        model: model || 'claude-haiku-4-5-20251001',
        max_tokens: max_tokens || 1000,
        system: system || '',
        messages: messages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`[ANTHROPIC ERROR] ${response.status}:`, JSON.stringify(data));
    } else {
      console.log(`[CHAT] Success | tokens used: ${data.usage?.output_tokens}`);
    }

    // Forward Anthropic's response directly to the browser
    res.status(response.status).json(data);

  } catch (err) {
    console.error('[FETCH ERROR]', err.message);
    res.status(500).json({
      error: { message: 'Could not reach Anthropic API: ' + err.message }
    });
  }
});

// ── FALLBACK: serve index.html for all other routes ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── START SERVER ──
app.listen(PORT, () => {
  console.log(`✅ RBCCI Chatbot running on port ${PORT}`);
  console.log(`🔑 API Key: ${process.env.ANTHROPIC_API_KEY ? 'LOADED ✓' : 'MISSING ✗ — set ANTHROPIC_API_KEY!'}`);
});
