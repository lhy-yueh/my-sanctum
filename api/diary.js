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
    const { historyText } = req.body || {};
    if (typeof historyText !== 'string') {
      return res.status(400).json({ error: 'historyText must be a string' });
    }

    const upstream = await fetch(MOONSHOT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'moonshot-v1-8k',
        messages: [
          { role: 'system', content: 'You are a wise, gentle observer creating poetic summaries.' },
          {
            role: 'user',
            content: `Summarize this conversation into a short, poetic, and soulful diary entry (about 100-150 words). Focus on the user's emotional journey and the strength they showed. Use the persona of a wise, gentle observer.\n\nConversation:\n${historyText}`,
          },
        ],
      }),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: data?.error?.message || 'Kimi API request failed',
      });
    }

    return res.status(200).json({
      text: data.choices?.[0]?.message?.content || 'A quiet moment of reflection, saved in the whispers of the forest.',
    });
  } catch (error) {
    console.error('Diary API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
