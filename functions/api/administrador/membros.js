export async function onRequest(context) {
    try {
        const { request, env } = context;

            if (!env.DB) {
                  return new Response(JSON.stringify({ error: "Banco de dados não configurado." }), { status: 500 });
                      }

                          // 🔒 BLOCO DE SEGURANÇA: Verifica se é um Admin válido antes de dar acesso aos dados
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

                                                                                    // 🚪 SE FOR UMA REQUISIÇÃO GET: O admin quer LISTAR os membros do banco
                                                                                        if (request.method === "GET") {
                                                                                              // Busca os membros cadastrados na tabela 'club_members' que você já tinha no schema
                                                                                                    const { results } = await env.DB.prepare(
                                                                                                            'SELECT id, codigo, nome, "e-mail", telefone, status, criado_em FROM club_members ORDER BY id DESC'
                                                                                                                  ).all();

                                                                                                                        return new Response(JSON.stringify({ success: true, members: results }), {
                                                                                                                                status: 200,
                                                                                                                                        headers: { "Content-Type": "application/json" }
                                                                                                                                              });
                                                                                                                                                  }

                                                                                                                                                      // 📥 SE FOR UMA REQUISIÇÃO POST: O admin quer CADASTRAR um membro novo manualmente
                                                                                                                                                          if (request.method === "POST") {
                                                                                                                                                                const { codigo, nome, email, telefone, senha_inicial } = await request.json();

                                                                                                                                                                      if (!codigo || !nome || !email || !senha_inicial) {
                                                                                                                                                                              return new Response(JSON.stringify({ error: "Campos obrigatórios faltando." }), { status: 400 });
                                                                                                                                                                                    }

                                                                                                                                                                                          // Insere o novo membro direto na tabela 'club_members'
                                                                                                                                                                                                await env.DB.prepare(
                                                                                                                                                                                                        'INSERT INTO club_members (codigo, nome, "e-mail", telefone, senha_hash, status) VALUES (?, ?, ?, ?, ?, ?)'
                                                                                                                                                                                                              ).bind(codigo, nome, email, telefone, senha_inicial, "ativo").run();

                                                                                                                                                                                                                    return new Response(JSON.stringify({ success: true, message: "Membro cadastrado com sucesso pelo administrador!" }), {
                                                                                                                                                                                                                            status: 201,
                                                                                                                                                                                                                                    headers: { "Content-Type": "application/json" }
                                                                                                                                                                                                                                          });
                                                                                                                                                                                                                                              }

                                                                                                                                                                                                                                                  // Se tentarem usar outro método (como PUT ou DELETE), barra o acesso
                                                                                                                                                                                                                                                      return new Response(JSON.stringify({ error: "Método não permitido." }), { status: 405 });

                                                                                                                                                                                                                                                        } catch (error) {
                                                                                                                                                                                                                                                            return new Response(JSON.stringify({ error: "Erro no servidor: " + error.message }), { status: 500 });
                                                                                                                                                                                                                                                              }
                                                                                                                                                                                                                                                              }
                                                                                                                                                                                                                                                              
}