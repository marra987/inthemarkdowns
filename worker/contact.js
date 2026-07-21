// Blog reach-out, deliverable 2 (docs/blog-reachout-spec.md in personal-assistant). The one
// dynamic route on an otherwise static site — everything else falls through to env.ASSETS, the
// same dist/ the static-only Worker used to serve alone (see wrangler.jsonc).
//
// Secrets (set with `wrangler secret put <name>`, never committed):
//   TURNSTILE_SECRET_KEY  — Cloudflare Turnstile widget's secret key
//   DISCORD_WEBHOOK_URL   — a channel webhook URL (Discord: channel settings → Integrations →
//                            Webhooks → New Webhook → Copy URL). Recommended sink: a dedicated
//                            #blog-inbox channel, per the spec.
//
// Reader input is untrusted: it is forwarded as inert message content, never rendered back into
// a page and never treated as instructions.

const MAX_MESSAGE_LEN = 4000;
const MAX_FIELD_LEN = 200;

async function verifyTurnstile(token, secret, ip) {
  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json();
  return data.success === true;
}

function truncate(value, max) {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

async function handleContact(request, env) {
  if (request.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return new Response('invalid json', { status: 400 });
  }

  const message = truncate(payload.message, MAX_MESSAGE_LEN).trim();
  const handle = truncate(payload.handle, MAX_FIELD_LEN).trim();
  const name = truncate(payload.name, MAX_FIELD_LEN).trim();
  const turnstileToken = typeof payload.turnstileToken === 'string' ? payload.turnstileToken : '';

  if (!message) {
    return new Response('message is required', { status: 400 });
  }
  if (!turnstileToken) {
    return new Response('turnstile token missing', { status: 400 });
  }

  const ip = request.headers.get('cf-connecting-ip') || undefined;
  const verified = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET_KEY, ip);
  if (!verified) {
    return new Response('turnstile verification failed', { status: 403 });
  }

  const lines = [
    '**New blog contact message**',
    name ? `From: ${name}` : null,
    handle ? `Reply: ${handle}` : null,
    '',
    message,
  ].filter((l) => l !== null);

  const discordRes = await fetch(env.DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ content: lines.join('\n').slice(0, 2000) }),
  });

  if (!discordRes.ok) {
    return new Response('forwarding failed', { status: 502 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/contact') {
      return handleContact(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};
