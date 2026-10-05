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
                                                                                        if (!dados.email || !dados.senha || !dados.nome) {
                                                                                                    return new Response(JSON.stringify({ error: "Nome, e-mail e senha sao obrigatorios" }), { status: 400, headers: corsHeaders });
                                                                                                            }
                                                                                                                    const codigo = dados.codigo || "UPM-" + Date.now().toString(36).toUpperCase();
                                                                                                                            const encoder = new TextEncoder();
                                                                                                                                    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(dados.senha));
                                                                                                                                            const senhaHash = Array.from(new Uint8Array(hashBuffer)).map(function(b) { return b.toString(16).padStart(2, "0"); }).join("");
                                                                                                                                                    await env.DB.prepare("INSERT INTO club_members (code, name, phone, email, password_hash, profile, city, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'active')").bind(codigo, dados.nome, dados.telefone || "", dados.email, senhaHash, dados.profile || "cliente", dados.city || "").run();
                                                                                                                                                            return new Response(JSON.stringify({ success: true, codigo: codigo }), { status: 200, headers: corsHeaders });
                                                                                                                                                                } catch (error) {
                                                                                                                                                                        return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
                                                                                                                                                                            }
                                                                                                                                                                            }
                                                                                                                                                                            
}