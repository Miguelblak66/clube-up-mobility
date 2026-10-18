import { getCorsHeaders, isLoginBlocked, recordLoginAttempt } from '../_utils.js';

export async function onRequest(context) {
  const { request, env } = context;

  const corsHeaders = await getCorsHeaders(env, request);
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  async function sha256Hex(value) {
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(value));
    return Array.from(new Uint8Array(hashBuffer))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  async function derivePbkdf2(password, saltHex) {
    const encoder = new TextEncoder();
    const saltBytes = Uint8Array.from(
      (saltHex || '').match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
    );

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        hash: 'SHA-256',
        salt: saltBytes,
        iterations: 120000
      },
      keyMaterial,
      256
    );

    return Array.from(new Uint8Array(derivedBits))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';

  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const senha = String(body.senha || '');

    if (!email || !senha) {
      return new Response(JSON.stringify({ error: 'E-mail e senha são obrigatorios' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const blocked = await isLoginBlocked(env, email, ip, { windowMinutes: 15, maxAttempts: 5 });
    if (blocked) {
      await recordLoginAttempt(env, email, ip, false);
      return new Response(JSON.stringify({ error: 'Muitas tentativas. Tente novamente em 15 minutos.' }), {
        status: 429,
        headers: corsHeaders
      });
    }

    const usuario = await env.DB.prepare(`
      SELECT mu.id, mu.member_id, mu.email, mu.password_hash, mu.salt, cm.name, cm.code
      FROM member_users mu
      JOIN club_members cm ON cm.id = mu.member_id
      WHERE lower(mu.email) = ? AND mu.status = 'active'
    `).bind(email).get();

    if (!usuario) {
      await recordLoginAttempt(env, email, ip, false);
      return new Response(JSON.stringify({ error: 'Credenciais invalidas' }), {
        status: 401,
        headers: corsHeaders
      });
    }

    let senhaValida = false;
    if (usuario.salt) {
      const derivedHash = await derivePbkdf2(senha, usuario.salt);
      senhaValida = derivedHash === usuario.password_hash;
    } else {
      const legacyHash = await sha256Hex(senha);
      senhaValida = legacyHash === usuario.password_hash;
    }

    if (!senhaValida) {
      await recordLoginAttempt(env, email, ip, false);
      return new Response(JSON.stringify({ error: 'Credenciais invalidas' }), {
        status: 401,
        headers: corsHeaders
      });
    }

    await recordLoginAttempt(env, email, ip, true);

    const expiraEm = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
    const token = crypto.randomUUID();

    await env.DB.prepare(`
      INSERT INTO sessoes (token, usuario_id, tipo_usuario, expira_em)
      VALUES (?, ?, ?, ?)
    `).bind(token, usuario.member_id, 'membro', expiraEm).run();

    return new Response(JSON.stringify({
      success: true,
      token,
      usuario: {
        id: usuario.member_id,
        name: usuario.name,
        code: usuario.code,
        email: usuario.email
      }
    }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Erro no login',
      detail: error?.message || 'Erro desconhecido'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
