/**
 * Vercel Serverless Function — /api/send
 * Recebe o formulário do Flexacil Chile, valida e normaliza o telefone,
 * envia para DrCash server-side (sem CORS) e redireciona para success.
 */

const TOKEN       = 'YZA0ZJDLZWYTZDK4ZC00YMJJLWJJNJATODZKNGJJMTE2MZQ4';
const STREAM_CODE = '5sjs8';
const DRCASH_URL  = 'https://order.drcash.sh/v1/order';

// ── Normaliza telefone chileno ──────────────────────────────────────────────
// Aceita: +569XXXXXXXX / 009XXXXXXXX / 569XXXXXXXX / 9XXXXXXXX / 09XXXXXXXX
function normalizeChilePhone(raw) {
  // Remove tudo que não é dígito ou +
  let s = raw.replace(/[^\d+]/g, '');

  // Remove + inicial para processar dígitos
  if (s.startsWith('+')) s = s.slice(1);

  // Remove 00 prefix (00CC...)
  if (s.startsWith('00')) s = s.slice(2);

  // Agora deve começar com 56 ou 9 ou 09
  if (s.startsWith('56')) {
    // já tem country code
  } else if (s.startsWith('09')) {
    s = '56' + s.slice(1);          // 09... → 569...
  } else if (s.startsWith('9')) {
    s = '56' + s;                   // 9... → 569...
  } else {
    return null; // formato desconhecido
  }

  // Chile: 56 + 9 dígitos = 11 dígitos totais
  if (!/^569\d{8}$/.test(s)) return null;

  return '+' + s; // +569XXXXXXXX
}

// ── Handler principal ───────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  // Só aceita POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const body  = req.body || {};
  const query = req.query || {};

  const rawName  = (body.name  || '').toString().trim();
  const rawPhone = (body.phone || '').toString().trim();

  // Subs vêm do body (hidden inputs) ou query string
  const sub1  = (body.sub1  || query.sub1  || '').toString().trim();
  const sub2  = (body.sub2  || query.sub2  || '').toString().trim();
  const sub3  = (body.sub3  || query.sub3  || '').toString().trim();
  const sub4  = (body.sub4  || query.sub4  || '').toString().trim();
  const sub5  = (body.sub5  || query.sub5  || '').toString().trim();
  const gclid = (body.gclid || query.gclid || '').toString().trim();

  // ── Validações básicas ──────────────────────────────────────────────────
  if (!rawName || rawName.length < 2) {
    return res.redirect(302, '/?error=name');
  }

  const phone = normalizeChilePhone(rawPhone);
  if (!phone) {
    return res.redirect(302, '/?error=phone');
  }

  // ── Payload DrCash ───────────────────────────────────────────────────────
  const payload = {
    stream_code: STREAM_CODE,
    client: {
      name:     rawName,
      phone:    phone,
      surname:  null,
      email:    null,
      address:  null,
      ip:       req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null,
      country:  'CL',
      city:     null,
      postcode: null
    },
    sub1:  sub1  || null,
    sub2:  sub2  || null,
    sub3:  sub3  || null,
    sub4:  sub4  || null,
    sub5:  sub5  || null,
    gclid: gclid || null
  };

  // ── Envia para DrCash (server-side, sem CORS) ────────────────────────────
  try {
    const response = await fetch(DRCASH_URL, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': 'Bearer ' + TOKEN
      },
      body: JSON.stringify(payload)
    });

    console.log('[DrCash] status:', response.status);

    if (!response.ok) {
      const text = await response.text();
      console.error('[DrCash] erro:', response.status, text);
    }
  } catch (err) {
    // Loga erro mas não bloqueia — redireciona para success de qualquer forma
    console.error('[DrCash] exception:', err.message);
  }

  // ── Redireciona para success com subs na URL (ClickDollar SDK lê lá) ─────
  const params = new URLSearchParams();
  if (sub1)  params.set('sub1',  sub1);
  if (sub2)  params.set('sub2',  sub2);
  if (sub3)  params.set('sub3',  sub3);
  if (sub4)  params.set('sub4',  sub4);
  if (sub5)  params.set('sub5',  sub5);
  if (gclid) params.set('gclid', gclid);

  const qs = params.toString();
  return res.redirect(302, '/thanks/' + (qs ? '?' + qs : ''));
};
