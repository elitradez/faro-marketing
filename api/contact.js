export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, message } = req.body ?? {};

  if (!name?.trim() || !email?.trim()) {
    return res.status(400).json({ error: 'Name and email are required' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.error('[contact] RESEND_API_KEY not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const safeName = String(name).slice(0, 200).replace(/</g, '&lt;');
  const safeEmail = String(email).slice(0, 200).replace(/</g, '&lt;');
  const safeMsg = String(message || '').slice(0, 2000).replace(/</g, '&lt;').replace(/\n/g, '<br>');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Laika <contact@laikacampus.com>',
      to: ['eli@laikacampus.com'],
      reply_to: email.trim(),
      subject: `Demo request from ${name.trim()}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message || '(no message provided)'}`,
      html: `<p><strong>Name:</strong> ${safeName}</p><p><strong>Email:</strong> ${safeEmail}</p>${safeMsg ? `<p><strong>Message:</strong><br>${safeMsg}</p>` : ''}`,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    let parsed;
    try { parsed = JSON.parse(body); } catch { parsed = body; }
    console.error('[contact] Resend error:', response.status, parsed);
    return res.status(502).json({ error: 'Failed to send email' });
  }

  return res.status(200).json({ ok: true });
}
