export async function onRequestPost(context) {
      try {
          const { request, env } = context;
              
                  if (!env.DB) {
                        return new Response(JSON.stringify({ error: "Banco de dados D1 não vinculado nas configurações." }), {
                                status: 500,
                                        headers: { "Content-Type": "application/json" }
                                              });
                                                  }

                                                      const { email, password } = await request.json();

                                                          if (!email || !password) {
                                                                return new Response(JSON.stringify({ error: "E-mail e senha são obrigatórios." }), {
                                                                        status: 400,
                                                                                headers: { "Content-Type": "application/json" }
                                                                                      });
                                                                                          }

                                                                                              // Busca o parceiro na tabela 'parceiros' do seu schema
                                                                                                  const parceiro = await env.DB.prepare(
                                                                                                        "SELECT * FROM parceiros WHERE email = ? LIMIT 1"
                                                                                                            ).bind(email).first();

                                                                                                                // Valida as credenciais do estabelecimento
                                                                                                                    if (!parceiro || parceiro.senha_hash !== password) {
                                                                                                                          return new Response(JSON.stringify({ error: "E-mail ou senha inválidos." }), {
                                                                                                                                  status: 401,
                                                                                                                                          headers: { "Content-Type": "application/json" }
                                                                                                                                                });
                                                                                                                                                    }

                                                                                                                                                        const token = crypto.randomUUID();
                                                                                                                                                            const expiraEm = new Date();
                                                                                                                                                                expiraEm.setDate(expiraEm.getDate() + 7);

                                                                                                                                                                    // Salva a sessão identificando o tipo como 'parceiro'
                                                                                                                                                                        await env.DB.prepare(
                                                                                                                                                                              "INSERT INTO sessoes (token, usuario_id, tipo_usuario, expira_em) VALUES (?, ?, ?, ?)"
                                                                                                                                                                                  ).bind(token, parceiro.id, "parceiro", expiraEm.toISOString()).run();

                                                                                                                                                                                      const cookie = `auth_token=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`;

                                                                                                                                                                                          return new Response(JSON.stringify({ 
                                                                                                                                                                                                success: true, 
                                                                                                                                                                                                      message: "Login de parceiro realizado com sucesso!",
                                                                                                                                                                                                            user: { nome: parceiro.nome_estabelecimento, responsavel: parceiro.responsavel }
                                                                                                                                                                                                                }), {
                                                                                                                                                                                                                      status: 200,
                                                                                                                                                                                                                            headers: {
                                                                                                                                                                                                                                    "Content-Type": "application/json",
                                                                                                                                                                                                                                            "Set-Cookie": cookie
                                                                                                                                                                                                                                                  }
                                                                                                                                                                                                                                                      });

                                                                                                                                                                                                                                                        } catch (error) {
                                                                                                                                                                                                                                                            return new Response(JSON.stringify({ error: "Erro interno no servidor: " + error.message }), {
                                                                                                                                                                                                                                                                  status: 500,
                                                                                                                                                                                                                                                                        headers: { "Content-Type": "application/json" }
                                                                                                                                                                                                                                                                            });
                                                                                                                                                                                                                                                                              }
                                                                                                                                                                                                                                                                              }
                                                                                                                                                                                                                                                                              
}
                                                                                                                        }
                                                                                                                        }
                                                                                                                        