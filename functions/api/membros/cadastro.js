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

    const nome = String(body.nome || body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const senha = String(body.senha || '');
    const telefone = String(body.telefone || body.phone || '').trim();
    const city = String(body.city || body.cidade || '').trim();
    const profile = String(body.profile || body.perfil || 'cliente').trim();

    if (!nome || !email || !senha || !telefone || !city) {
      return new Response(JSON.stringify({
        error: 'Nome, e-mail, senha, telefone e cidade são obrigatorios'
      }), {
        status: 400,
        headers: corsHeaders
      });
    }

    const emailExists = await env.DB.prepare(`
      SELECT 1 FROM member_users WHERE lower(email) = ?
    `).bind(email).get();

    if (emailExists) {
      return new Response(JSON.stringify({ error: 'Este e-mail já está cadastrado.' }), {
        status: 409,
        headers: corsHeaders
      });
    }

    const code = String(body.codigo || body.code || `MEM-${Date.now().toString(36).toUpperCase()}`);

    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(senha));
    const senhaHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const memberInsert = await env.DB.prepare(`
      INSERT INTO club_members (code, name, phone, email, profile, city, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(code, nome, telefone, email, profile, city, 'active').run();

    const memberId = memberInsert?.meta?.last_row_id ?? null;
    if (!memberId) {
      return new Response(JSON.stringify({ error: 'Não foi possível criar o membro.' }), {
        status: 500,
        headers: corsHeaders
      });
    }

    await env.DB.prepare(`
      INSERT INTO member_users (member_id, email, password_hash, status)
      VALUES (?, ?, ?, ?)
    `).bind(memberId, email, senhaHash, 'active').run();

    return new Response(JSON.stringify({
      success: true,
      code,
      message: 'Cadastro realizado com sucesso'
    }), {
      status: 201,
      headers: corsHeaders
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Erro ao cadastrar membro',
      detail: error?.message || 'Erro desconhecido'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
