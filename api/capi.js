import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { event_name, event_id, event_source_url, user_data, fbp, fbc } = req.body;

  if (!user_data || !user_data.phone || !user_data.name) {
    return res.status(400).json({ error: 'Faltan datos del usuario' });
  }

  const pixel_id = process.env.META_PIXEL_ID;
  const access_token = process.env.META_ACCESS_TOKEN;

  if (!pixel_id || !access_token) {
    return res.status(500).json({ error: 'Faltan credenciales del servidor' });
  }

  function hashSHA256(data) {
    return crypto.createHash('sha256').update(data.trim().toLowerCase()).digest('hex');
  }

  const payload = {
    data: [
      {
        event_name: event_name || 'Contact',
        event_time: Math.floor(Date.now() / 1000),
        event_id: event_id || `event_${Date.now()}`,
        event_source_url: event_source_url || process.env.DOMAIN_ORIGIN,
        action_source: 'website',
        user_data: {
          ph: hashSHA256(user_data.phone),
          fn: hashSHA256(user_data.name),
          fbp: fbp || null,
          fbc: fbc || null,
          client_user_agent: req.headers['user-agent'] || '',
        },
        custom_data: {
          content_name: 'Registro de usuario desde landing',
        },
      },
    ],
    test_event_code: process.env.TEST_EVENT_CODE || undefined,
  };

  try {
    const response = await fetch(`https://graph.facebook.com/v18.0/${pixel_id}/events?access_token=${access_token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(400).json({ error: 'Error enviando evento a Meta', details: data });
    }

    return res.status(200).json({ success: true, fb_response: data });
  } catch (error) {
    return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
}
