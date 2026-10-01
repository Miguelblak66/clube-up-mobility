export async function onRequest(context) {
    try {
        const { request, env } = context;

            if (!env.DB) {
                  return new Response(JSON.stringify({ error: "Banco de dados não configurado." }), { status: 500 });
                      }

                          // 🔒 BLOCO DE SEGURANÇA: Verifica se é um Admin válido antes de dar acesso aos dados dos parceiros
                              const cookieHeader = request.headers.get("Cookie") || "";
                                  const cookies = Object.fromEntries(cookieHeader.split(";").map(c => c.trim().split("=")));
                                      const token = cookies["auth_token"];

                                          if (!token) {
                                                return new Response(JSON.stringify({ error: "Acesso negado. Faça login como administrador." }), { status: 401 });
                                                    }

                                                        const sessao = await env.DB.prepare(
                                                              "SELECT * FROM sessoes WHERE token = ? AND datetime(expira_em) > datetime('now') LIMIT 1"
                                                                  ).bind(token).first();

                                                                      if (!sessao || sessao.tipo_usuario !== "admin") {
                                                                            return new Response(JSON.stringify({ error: "Sessão inválida ou expirada." }), { status: 401 });
                                                                                }

                                                                                    // 🚪 SE FOR UMA REQUISIÇÃO GET: O admin quer LISTAR os parceiros cadastrados
                                                                                        if (request.method === "GET") {
                                                                                              // Busca os parceiros comerciais cadastrados na tabela 'parceiros' do seu schema
                                                                                                    const { results } = await env.DB.prepare(
                                                                                                            "SELECT id, nome_estabelecimento, responsavel, email, categoria, criado_em FROM parceiros ORDER BY id DESC"
                                                                                                                  ).all();

                                                                                                                        return new Response(JSON.stringify({ success: true, partners: results }), {
                                                                                                                                status: 200,
                                                                                                                                        headers: { "Content-Type": "application/json" }
                                                                                                                                              });
                                                                                                                                                  }

                                                                                                                                                      // 📥 SE FOR UMA REQUISIÇÃO POST: O admin quer CADASTRAR um novo estabelecimento parceiro
                                                                                                                                                          if (request.method === "POST") {
                                                                                                                                                                const { nome_estabelecimento, responsavel, email, senha_inicial, categoria } = await request.json();

                                                                                                                                                                      if (!nome_estabelecimento || !responsavel || !email || !senha_inicial) {
                                                                                                                                                                              return new Response(JSON.stringify({ error: "Campos obrigatórios faltando." }), { status: 400 });
                                                                                                                                                                                    }

                                                                                                                                                                                          // Insere o novo parceiro na tabela 'parceiros' do seu banco
                                                                                                                                                                                                await env.DB.prepare(
                                                                                                                                                                                                        "INSERT INTO parceiros (nome_estabelecimento, responsavel, email, senha_hash, categoria) VALUES (?, ?, ?, ?, ?)"
                                                                                                                                                                                                              ).bind(nome_estabelecimento, responsavel, email, senha_inicial, categoria).run();

                                                                                                                                                                                                                    return new Response(JSON.stringify({ success: true, message: "Estabelecimento parceiro cadastrado com sucesso!" }), {
                                                                                                                                                                                                                            status: 201,
                                                                                                                                                                                                                                    headers: { "Content-Type": "application/json" }
                                                                                                                                                                                                                                          });
                                                                                                                                                                                                                                              }

                                                                                                                                                                                                                                                  return new Response(JSON.stringify({ error: "Método não permitido." }), { status: 405 });

                                                                                                                                                                                                                                                    } catch (error) {
                                                                                                                                                                                                                                                        return new Response(JSON.stringify({ error: "Erro no servidor: " + error.message }), { status: 500 });
                                                                                                                                                                                                                                                          }
                                                                                                                                                                                                                                                          }
                                                                                                                                                                                                                                                          
}