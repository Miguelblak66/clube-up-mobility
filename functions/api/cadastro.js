export async function onRequestPost(context) {
        const { request, env } = context;

            // Cabeçalhos de segurança CORS para liberar o seu site no GitHub
                const corsHeaders = {
                        "Access-Control-Allow-Origin": "https://github.io",
                                "Access-Control-Allow-Methods": "POST, OPTIONS",
                                        "Access-Control-Allow-Headers": "Content-Type, Authorization",
                                            };

                                                try {
                                                        const dados = await request.json();
                                                                
                                                                        if (!dados.codigo || !dados.nome || !dados.email || !dados.senha) {
                                                                                    return new Response(JSON.stringify({ error: "Campos obrigatórios ausentes" }), {
                                                                                                    status: 400,
                                                                                                                    headers: { ...corsHeaders, "Content-Type": "application/json" }
                                                                                                                                });
                                                                                                                                        }

                                                                                                                                                // Grava o novo membro direto na tabela 'club_members' do seu banco D1
                                                                                                                                                        await env.DB.prepare(
                                                                                                                                                                    `INSERT INTO club_members (codigo, nome, "e-mail", senha_hash) VALUES (?, ?, ?, ?)`
                                                                                                                                                                            )
                                                                                                                                                                                    .bind(dados.codigo, dados.nome, dados.email, dados.senha)
                                                                                                                                                                                            .run();

                                                                                                                                                                                                    return new Response(JSON.stringify({ success: true, message: "Membro cadastrado com sucesso!" }), {
                                                                                                                                                                                                                status: 200,
                                                                                                                                                                                                                            headers: { ...corsHeaders, "Content-Type": "application/json" }
                                                                                                                                                                                                                                    });

                                                                                                                                                                                                                                        } catch (error) {
                                                                                                                                                                                                                                                return new Response(JSON.stringify({ error: "Erro no banco de dados: " + error.message }), {
                                                                                                                                                                                                                                                            status: 500,
                                                                                                                                                                                                                                                                        headers: { ...corsHeaders, "Content-Type": "application/json" }
                                                                                                                                                                                                                                                                                });
                                                                                                                                                                                                                                                                                    }
                                                                                                                                                                                                                                                                                    }

                                                                                                                                                                                                                                                                                    // Resposta imediata para a checagem de segurança (OPTIONS) do navegador
                                                                                                                                                                                                                                                                                    export async function onRequestOptions() {
                                                                                                                                                                                                                                                                                        return new Response(null, {
                                                                                                                                                                                                                                                                                                headers: {
                                                                                                                                                                                                                                                                                                            "Access-Control-Allow-Origin": "https://github.io",
                                                                                                                                                                                                                                                                                                                        "Access-Control-Allow-Methods": "POST, OPTIONS",
                                                                                                                                                                                                                                                                                                                                    "Access-Control-Allow-Headers": "Content-Type, Authorization",
                                                                                                                                                                                                                                                                                                                                            }
                                                                                                                                                                                                                                                                                                                                                });
                                                                                                                                                                                                                                                                                                                                                }
                                                                                                                                                                                                                                                                                                                                                
}