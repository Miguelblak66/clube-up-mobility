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

    const emailExists = await env.db.prepare(`
      SELECT 1 FROM member_users WHERE lower(email) = ?
    `).bind(email).get();

    if (emailExists) {
      return new Response(JSON.stringify({ error: 'Este e-mail já está cadastrado.' }), {
        status: 409,
        headers: corsHeaders
      });
    }

    const code = String(body.codigo || body.code || `MEM-${Date.now().toString(36).toUpperCase()}`);
    const saltBytes = crypto.getRandomValues(new Uint8Array(16));
    const saltHex = Array.from(saltBytes)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
    const senhaHash = await derivePbkdf2(senha, saltHex);

    const memberInsert = await env.db.prepare(`
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

    await env.db.prepare(`
      INSERT INTO member_users (member_id, email, password_hash, salt, status)
      VALUES (?, ?, ?, ?, ?)
    `).bind(memberId, email, senhaHash, saltHex, 'active').run();

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
