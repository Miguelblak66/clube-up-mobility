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
                                                                                    if (!dados.email || !dados.senha) {
                                                                                                return new Response(JSON.stringify({ error: "E-mail e senha sao obrigatorios" }), { status: 400, headers: corsHeaders });
                                                                                                        }
                                                                                                                const encoder = new TextEncoder();
                                                                                                                        const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(dados.senha));
                                                                                                                                const senhaHash = Array.from(new Uint8Array(hashBuffer)).map(function(b) { return b.toString(16).padStart(2, "0"); }).join("");
                                                                                                                                        const usuario = await env.DB.prepare("SELECT id, code, name, email, status FROM club_members WHERE email = ? AND password_hash = ? AND status = 'active'").bind(dados.email, senhaHash).first();
                                                                                                                                                if (!usuario) {
                                                                                                                                                            return new Response(JSON.stringify({ error: "E-mail ou senha incorretos" }), { status: 401, headers: corsHeaders });
                                                                                                                                                                    }
                                                                                                                                                                            const expiraEm = new Date(Date.now() + 86400000).toISOString();
                                                                                                                                                                                    const token = btoa(JSON.stringify({ id: usuario.id, exp: expiraEm }));
                                                                                                                                                                                            await env.DB.prepare("INSERT INTO sessoes (token, usuario_id, tipo_usuario, expira_em) VALUES (?, ?, 'membro', ?)").bind(token, usuario.id, expiraEm).run();
                                                                                                                                                                                                    return new Response(JSON.stringify({ success: true, token: token }), { status: 200, headers: corsHeaders });
                                                                                                                                                                                                        } catch (error) {
                                                                                                                                                                                                                return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
                                                                                                                                                                                                                    }
                                                                                                                                                                                                                    }
                                                                                                                                                                                                                    
}