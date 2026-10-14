export async function onRequest(context) {
  const { request, env } = context;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json"
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Token nao fornecido' }), {
        status: 401,
        headers: corsHeaders
      });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const sessao = await env.DB.prepare(`
      SELECT s.usuario_id, s.expira_em, a.nome, a.email
      FROM sessoes s
      JOIN administradores a ON a.id = s.usuario_id
      WHERE s.token = ? AND s.tipo_usuario = 'admin'
    `).bind(token).get();

    if (!sessao) {
      return new Response(JSON.stringify({ error: 'Sessao invalida' }), {
        status: 401,
        headers: corsHeaders
      });
    }

    if (new Date(sessao.expira_em) < new Date()) {
      await env.DB.prepare('DELETE FROM sessoes WHERE token = ?').bind(token).run();
      return new Response(JSON.stringify({ error: 'Sessao expirada' }), {
        status: 401,
        headers: corsHeaders
      });
    }

    const membros = await env.DB.prepare(`
      SELECT id, code, name, email, profile, city, status
      FROM club_members
      ORDER BY created_at DESC
    `).all();

    return new Response(JSON.stringify({
      success: true,
      usuario: {
        id: sessao.usuario_id,
        nome: sessao.nome,
        email: sessao.email
      },
      membros: membros.results || []
    }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Erro ao listar membros',
      detail: error?.message || 'Erro desconhecido'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
