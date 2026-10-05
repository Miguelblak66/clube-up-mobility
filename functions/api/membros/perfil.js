export async function onRequest(context) {
        const { request, env } = context;
            const corsHeaders = {
                    "Access-Control-Allow-Origin": "*",
                            "Access-Control-Allow-Methods": "GET, OPTIONS",
                                    "Access-Control-Allow-Headers": "Content-Type, Authorization",
                                            "Content-Type": "application/json"
                                                };
                                                    if (request.method === "OPTIONS") {
                                                            return new Response(null, { headers: corsHeaders });
                                                                }
                                                                    try {
                                                                            const authHeader = request.headers.get("Authorization");
                                                                                    if (!authHeader || !authHeader.startsWith("Bearer ")) {
                                                                                                return new Response(JSON.stringify({ error: "Token nao fornecido" }), { status: 401, headers: corsHeaders });
                                                                                                        }
                                                                                                                const token = authHeader.replace("Bearer ", "");
                                                                                                                        const sessao = await env.DB.prepare("SELECT s.usuario_id, s.expira_em, m.code, m.name, m.email, m.status FROM sessoes s JOIN club_members m ON m.id = s.usuario_id WHERE s.token = ? AND s.tipo_usuario = 'membro'").bind(token).first();
                                                                                                                                if (!sessao) {
                                                                                                                                            return new Response(JSON.stringify({ error: "Sessao invalida" }), { status: 401, headers: corsHeaders });
                                                                                                                                                    }
                                                                                                                                                            if (new Date(sessao.expira_em) < new Date()) {
                                                                                                                                                                        await env.DB.prepare("DELETE FROM sessoes WHERE token = ?").bind(token).run();
                                                                                                                                                                                    return new Response(JSON.stringify({ error: "Sessao expirada" }), { status: 401, headers: corsHeaders });
                                                                                                                                                                                            }
                                                                                                                                                                                                    return new Response(JSON.stringify({ id: sessao.usuario_id, codigo: sessao.code, nome: sessao.name, email: sessao.email, status: sessao.status === "active" ? "Ativo" : "Inativo" }), { status: 200, headers: corsHeaders });
                                                                                                                                                                                                        } catch (error) {
                                                                                                                                                                                                                return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
                                                                                                                                                                                                                    }
                                                                                                                                                                                                                    }
                                                                                                                                                                                                                    
}