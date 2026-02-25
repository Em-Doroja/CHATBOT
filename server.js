const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/chat', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error('ERROR: ANTHROPIC_API_KEY is not set!');
    return res.status(500).json({ error: { message: 'API key not configured.' } });
  }

  // Log incoming request
  console.log('=== NEW CHAT REQUEST ===');
  console.log('Model:', req.body.model);
  console.log('Messages:', req.body.messages?.length);
  console.log('Key prefix:', apiKey.substring(0, 25) + '...');

  // Force correct model
  const payload = {
    ...req.body,
    model: 'claude-haiku-4-5-20251001'
  };

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log('Anthropic status:', response.status);
    console.log('Anthropic reply:', JSON.stringify(data).substring(0, 400));

    res.status(response.status).json(data);

  } catch (err) {
    console.error('Fetch error:', err.message);
    res.status(500).json({ error: { message: 'Server error: ' + err.message } });
  }
});

app.listen(PORT, () => {
  console.log('RBCCI Chatbot running on port', PORT);
});
