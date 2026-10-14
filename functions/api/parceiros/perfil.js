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
      SELECT s.usuario_id, s.expira_em, p.company_name, p.code, p.email, p.status
      FROM sessoes s
      JOIN partners p ON p.id = s.usuario_id
      WHERE s.token = ? AND s.tipo_usuario = 'parceiro'
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

    return new Response(JSON.stringify({
      success: true,
      usuario: {
        id: sessao.usuario_id,
        company_name: sessao.company_name,
        code: sessao.code,
        email: sessao.email
      }
    }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Erro ao buscar perfil do parceiro',
      detail: error?.message || 'Erro desconhecido'
    }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
