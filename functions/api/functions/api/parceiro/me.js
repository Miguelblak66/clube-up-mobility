export async function onRequestGet(context) {
    try {
        const { request, env } = context;

            if (!env.DB) {
                  return new Response(JSON.stringify({ authenticated: false, error: "Banco de dados não configurado." }), { status: 500 });
                      }

                          // 1. Pega o cookie de autenticação do parceiro
                              const cookieHeader = request.headers.get("Cookie") || "";
                                  const cookies = Object.fromEntries(cookieHeader.split(";").map(c => c.trim().split("=")));
                                      const token = cookies["auth_token"];

                                          if (!token) {
                                                return new Response(JSON.stringify({ authenticated: false }), { status: 401 });
                                                    }

                                                        // 2. Verifica se a sessão existe e se é do tipo 'parceiro'
                                                            const sessao = await env.DB.prepare(
                                                                  "SELECT * FROM sessoes WHERE token = ? AND datetime(expira_em) > datetime('now') LIMIT 1"
                                                                      ).bind(token).first();

                                                                          if (!sessao || sessao.tipo_usuario !== "parceiro") {
                                                                                return new Response(JSON.stringify({ authenticated: false, error: "Sessão inválida ou expirada." }), { status: 401 });
                                                                                    }

                                                                                        // 3. Busca os dados reais do estabelecimento na tabela 'parceiros' do seu schema
                                                                                            const parceiro = await env.DB.prepare(
                                                                                                  "SELECT id, nome_estabelecimento, responsavel, email, categoria FROM parceiros WHERE id = ? LIMIT 1"
                                                                                                      ).bind(sessao.usuario_id).first();

                                                                                                          if (!parceiro) {
                                                                                                                return new Response(JSON.stringify({ authenticated: false, error: "Parceiro não encontrado." }), { status: 401 });
                                                                                                                    }

                                                                                                                        // 4. Retorna o perfil completo do parceiro logado
                                                                                                                            return new Response(JSON.stringify({
                                                                                                                                  authenticated: true,
                                                                                                                                        user: {
                                                                                                                                                id: parceiro.id,
                                                                                                                                                        nome: parceiro.nome_estabelecimento,
                                                                                                                                                                responsavel: parceiro.responsavel,
                                                                                                                                                                        email: parceiro.email,
                                                                                                                                                                                categoria: parceiro.categoria,
                                                                                                                                                                                        tipo: "parceiro"
                                                                                                                                                                                              }
                                                                                                                                                                                                  }), {
                                                                                                                                                                                                        status: 200,
                                                                                                                                                                                                              headers: { "Content-Type": "application/json" }
                                                                                                                                                                                                                  });

                                                                                                                                                                                                                    } catch (error) {
                                                                                                                                                                                                                        return new Response(JSON.stringify({ authenticated: false, error: error.message }), { status: 500 });
                                                                                                                                                                                                                          }
                                                                                                                                                                                                                          }
                                                                                                                                                                                                                          
}