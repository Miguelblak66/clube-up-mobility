export async function onRequest(context) {
  const { request, env } = context;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    const admin = await env.DB.prepare(`
      SELECT id, nome, email, senha, salt
      FROM administradores
      WHERE lower(email) = ?
    `).bind(email).get();

    if (!admin) {
      return new Response(JSON.stringify({ error: 'Credenciais invalidas' }), {
        status: 401,
        headers: corsHeaders
      });
    }

    const senhaValida = admin.salt
      ? (await derivePbkdf2(senha, admin.salt)) === admin.senha
      : await crypto.subtle.digest('SHA-256', new TextEncoder().encode(senha)).then((buf) =>
          Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
        ) === admin.senha;

    if (!senhaValida) {
      return new Response(JSON.stringify({ error: 'Credenciais invalidas' }), {
        status: 401,
        headers: corsHeaders
      });
    }

    const expiraEm = new Date(Date.now() + 1000 * 60 * 60 * 8).toISOString();
    const token = crypto.randomUUID();

    await env.DB.prepare(`
      INSERT INTO sessoes (token, usuario_id, tipo_usuario, expira_em)
      VALUES (?, ?, ?, ?)
    `).bind(token, admin.id, 'admin', expiraEm).run();

    return new Response(JSON.stringify({
      success: true,
      token,
      usuario: {
        id: admin.id,
        nome: admin.nome,
        email: admin.email
      }
    }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Erro no login do admin',
      detail: error?.message || 'Erro desconhecido'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
