// functions/api/_utils.js
// Shared helpers for CORS, session verification and login rate limiting.
export async function getCorsHeaders(env, request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const base = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  };

  if (allowed.length === 0) {
    // No restriction configured -> keep legacy behavior for dev
    return Object.assign({ "Access-Control-Allow-Origin": "*" }, base);
  }

  // If origin is allowed, echo it. Otherwise return a safe null origin.
  if (origin && allowed.includes(origin)) {
    return Object.assign({ "Access-Control-Allow-Origin": origin }, base);
  }

  return Object.assign({ "Access-Control-Allow-Origin": "null" }, base);
}

export async function verifySession(env, token, expectedRole) {
  if (!token) {
    const e = new Error('Token nao fornecido');
    e.status = 401;
    throw e;
  }

  const sessao = await env.db.prepare(
    `SELECT s.usuario_id, s.expira_em
     FROM sessoes s
     WHERE s.token = ? AND s.tipo_usuario = ?`
  ).bind(token, expectedRole).get();

  if (!sessao) {
    const e = new Error('Sessao invalida');
    e.status = 401;
    throw e;
  }

  if (new Date(sessao.expira_em) < new Date()) {
    await env.db.prepare('DELETE FROM sessoes WHERE token = ?').bind(token).run();
    const e = new Error('Sessao expirada');
    e.status = 401;
    throw e;
  }

  return sessao;
}

// Simple db-backed rate limiting for login attempts.
// Blocks if there are more than `maxAttempts` failed attempts for the email or IP in the last `windowMinutes` minutes.
export async function isLoginBlocked(env, email, ip, opts = {}) {
  const windowMinutes = opts.windowMinutes || 15;
  const maxAttempts = opts.maxAttempts || 5;
  const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  const byEmail = await env.db.prepare(`SELECT COUNT(*) as cnt FROM login_attempts WHERE email = ? AND success = 0 AND created_at > ?`).bind(email, cutoff).get();
  const byIp = await env.db.prepare(`SELECT COUNT(*) as cnt FROM login_attempts WHERE ip = ? AND success = 0 AND created_at > ?`).bind(ip, cutoff).get();

  const emailCount = (byEmail && byEmail.cnt) ? Number(byEmail.cnt) : 0;
  const ipCount = (byIp && byIp.cnt) ? Number(byIp.cnt) : 0;

  return emailCount >= maxAttempts || ipCount >= maxAttempts;
}

export async function recordLoginAttempt(env, email, ip, success) {
  await env.db.prepare(`INSERT INTO login_attempts (email, ip, success, created_at) VALUES (?, ?, ?, ?)`).bind(email, ip, success ? 1 : 0, new Date().toISOString()).run();
}
