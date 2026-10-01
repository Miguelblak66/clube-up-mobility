export async function onRequestGet(context) {
      try {
          const { request, env } = context;

              if (!env.DB) {
                    return new Response(JSON.stringify({ authenticated: false, error: "Banco de dados não configurado." }), { status: 500 });
                        }

                            // 1. Pega o cookie de autenticação guardado no navegador do celular
                                const cookieHeader = request.headers.get("Cookie") || "";
                                    const cookies = Object.fromEntries(cookieHeader.split(";").map(c => c.trim().split("=")));
                                        const token = cookies["auth_token"];

                                            if (!token) {
                                                  return new Response(JSON.stringify({ authenticated: false }), { status: 401 });
                                                      }

                                                          // 2. Busca na tabela 'sessoes' para ver se o token é válido e ainda não expirou
                                                              const sessao = await env.DB.prepare(
                                                                    "SELECT * FROM sessoes WHERE token = ? AND datetime(expira_em) > datetime('now') LIMIT 1"
                                                                        ).bind(token).first();

                                                                            if (!sessao || sessao.tipo_usuario !== "membro") {
                                                                                  return new Response(JSON.stringify({ authenticated: false, error: "Sessão inválida ou expirada." }), { status: 401 });
                                                                                      }

                                                                                          // 3. Com o id do usuário em mãos, busca os dados reais dele na tabela 'club_members'
                                                                                              const membro = await env.DB.prepare(
                                                                                                    'SELECT id, codigo, nome, "e-mail", status FROM club_members WHERE id = ? LIMIT 1'
                                                                                                        ).bind(sessao.usuario_id).first();

                                                                                                            if (!membro || membro.status !== 'ativo') {
                                                                                                                  return new Response(JSON.stringify({ authenticated: false, error: "Usuário não encontrado ou inativo." }), { status: 401 });
                                                                                                                      }

                                                                                                                          // 4. Retorna os dados do perfil do membro logado
                                                                                                                              return new Response(JSON.stringify({
                                                                                                                                    authenticated: true,
                                                                                                                                          user: {
                                                                                                                                                  id: membro.id,
                                                                                                                                                          codigo: membro.codigo,
                                                                                                                                                                  nome: membro.nome,
                                                                                                                                                                          email: membro['e-mail'],
                                                                                                                                                                                  tipo: "membro"
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