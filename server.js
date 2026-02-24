const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ── MIDDLEWARE ──
app.use(cors());
app.use(express.json());

// ── SERVE STATIC FILES FROM public/ FOLDER ──
app.use(express.static(path.join(__dirname, 'public')));

// ── SERVE index.html FOR ROOT ROUTE ──
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── PROXY ROUTE: Anthropic API ──
// Your chatbot calls THIS server instead of Anthropic directly.
// The API key stays secret on the server — never exposed to the browser.
app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: { message: 'API key not configured on server.' } });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    res.status(response.status).json(data);

  } catch (err) {
    console.error('Anthropic API error:', err);
    res.status(500).json({ error: { message: 'Server error. Please try again.' } });
  }
});


app.listen(PORT, () => {
  console.log(`✅ RBCCI Chatbot Server running on port ${PORT}`);
});
