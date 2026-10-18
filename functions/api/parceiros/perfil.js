import { getCorsHeaders, verifySession } from '../_utils.js';

export async function onRequest(context) {
  const { request, env } = context;
  const corsHeaders = await getCorsHeaders(env, request);

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.replace('Bearer ', '').trim() : null;

    const sessao = await verifySession(env, token, 'parceiro');
    const parceiro = await env.DB.prepare(`
      SELECT p.id, p.company_name, p.code, p.email, p.status
      FROM partners p
      WHERE p.id = ?
    `).bind(sessao.usuario_id).get();

    if (!parceiro) {
      return new Response(JSON.stringify({ error: 'Sessao invalida' }), {
        status: 401,
        headers: corsHeaders
      });
    }

    return new Response(JSON.stringify({
      success: true,
      usuario: {
        id: parceiro.id,
        company_name: parceiro.company_name,
        code: parceiro.code,
        email: parceiro.email
      }
    }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (error) {
    const status = error?.status || 500;
    const payload = status === 401
      ? { error: error?.message || 'Sessao invalida' }
      : {
          error: 'Erro ao buscar perfil do parceiro',
          detail: error?.message || 'Erro desconhecido'
        };

    return new Response(JSON.stringify(payload), {
      status,
      headers: corsHeaders
    });
  }
}
