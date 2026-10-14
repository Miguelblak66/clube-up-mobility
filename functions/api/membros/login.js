export async function onRequest(context) {
  const { request, env } = context;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(senha));
    const senhaHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const usuario = await env.DB.prepare(`
      SELECT mu.id, mu.member_id, mu.email, cm.name, cm.code
      FROM member_users mu
      JOIN club_members cm ON cm.id = mu.member_id
      WHERE lower(mu.email) = ? AND mu.password_hash = ? AND mu.status = 'active'
    `).bind(email, senhaHash).get();

    if (!usuario) {
      return new Response(JSON.stringify({ error: 'Credenciais invalidas' }), {
        status: 401,
        headers: corsHeaders
      });
    }

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
