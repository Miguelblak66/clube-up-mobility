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
    const dados = await request.json();

    if (!dados.nome || !dados.email || !dados.senha || !dados.phone || !dados.city) {
      return new Response(
        JSON.stringify({ error: "Nome, e-mail, senha, telefone e cidade sao obrigatorios" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const code = dados.codigo || "MEM-" + Date.now().toString(36).toUpperCase();

    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(dados.senha));
    const senhaHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const memberInsert = await env.DB.prepare(`
      INSERT INTO club_members (code, name, phone, email, profile, city, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      code,
      dados.nome,
      dados.phone,
      dados.email,
      dados.profile || "cliente",
      dados.city,
      "active"
    ).run();

    const memberId = memberInsert.meta?.last_row_id;

    await env.DB.prepare(`
      INSERT INTO member_users (member_id, email, password_hash, status)
      VALUES (?, ?, ?, ?)
    `).bind(
      memberId,
      dados.email,
      senhaHash,
      "active"
    ).run();

    return new Response(
      JSON.stringify({ success: true, code, message: "Cadastro realizado com sucesso" }),
      { status: 201, headers: corsHeaders }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Erro ao cadastrar membro", detail: error.message }),
      { status: 500, headers: corsHeaders }
    );
  }
}
