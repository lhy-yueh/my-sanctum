const MOONSHOT_API_URL = 'https://api.moonshot.cn/v1/chat/completions';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.KIMI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'KIMI_API_KEY is not configured' });
  }

  try {
    const { messages } = req.body || {};
    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages must be an array' });
    }

    const upstream = await fetch(MOONSHOT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'moonshot-v1-8k',
        messages,
      }),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: data?.error?.message || 'Kimi API request failed',
      });
    }

    return res.status(200).json({
      text: data.choices?.[0]?.message?.content || '...',
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
