const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ── MIDDLEWARE ──
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── HEALTH CHECK ──
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── CHAT API ROUTE ──
app.post('/api/chat', async (req, res) => {
  // Check for API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ERROR: ANTHROPIC_API_KEY environment variable is not set!');
    return res.status(500).json({
      error: { message: 'Server configuration error: API key not set.' }
    });
  }

  const { model, max_tokens, system, messages } = req.body;

  // Validate request body
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({
      error: { message: 'Invalid request: messages array is required.' }
    });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model || 'claude-haiku-4-5-20251001',
        max_tokens: max_tokens || 1000,
        system: system || '',
        messages: messages
      })
    });

    const data = await response.json();

    // Forward Anthropic's response (or error) directly to the client
    res.status(response.status).json(data);

  } catch (err) {
    console.error('Error calling Anthropic API:', err.message);
    res.status(500).json({
      error: { message: 'Failed to reach Anthropic API. Please try again.' }
    });
  }
});

// ── FALLBACK: serve index.html for all other routes ──
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── START SERVER ──
app.listen(PORT, () => {
  console.log(`✅ RBCCI Chatbot server running on port ${PORT}`);
  console.log(`🔑 API Key loaded: ${process.env.ANTHROPIC_API_KEY ? 'YES ✓' : 'NO ✗ (set ANTHROPIC_API_KEY!)'}`);
});
