export async function onRequestPost(context) {
      try {
          const { request, env } = context;
              
                  // 1. Verifica se a conexão com o banco Cloudflare D1 está configurada
                      if (!env.DB) {
                            return new Response(JSON.stringify({ error: "Banco de dados D1 não vinculado nas configurações." }), {
                                    status: 500,
                                            headers: { "Content-Type": "application/json" }
                                                  });
                                                      }

                                                          // 2. Captura os dados enviados pelo formulário do app/site
                                                              const { email, password } = await request.json();

                                                                  if (!email || !password) {
                                                                        return new Response(JSON.stringify({ error: "E-mail e senha são obrigatórios." }), {
                                                                                status: 400,
                                                                                        headers: { "Content-Type": "application/json" }
                                                                                              });
                                                                                                  }

                                                                                                      // 3. Busca o membro no banco de dados pela tabela que você já tinha (club_members)
                                                                                                          // Nota: Como o e-mail no seu schema está como 'e-mail', usamos entre aspas no SQL
                                                                                                              const membro = await env.DB.prepare(
                                                                                                                    'SELECT * FROM club_members WHERE "e-mail" = ? LIMIT 1'
                                                                                                                        ).bind(email).first();

                                                                                                                            // 4. Verifica se o usuário existe e se a senha está correta
                                                                                                                                // ⚠️ Importante: Para produção, use criptografia (ex: Web Crypto API) para comparar as senhas em hash!
                                                                                                                                    if (!membro || membro.senha_hash !== password) {
                                                                                                                                          return new Response(JSON.stringify({ error: "E-mail ou senha inválidos." }), {
                                                                                                                                                  status: 401,
                                                                                                                                                          headers: { "Content-Type": "application/json" }
                                                                                                                                                                });
                                                                                                                                                                    }

                                                                                                                                                                        // 5. Verifica se o membro não está bloqueado ou suspenso
                                                                                                                                                                            if (membro.status !== 'ativo') {
                                                                                                                                                                                  return new Response(JSON.stringify({ error: "Esta conta não está ativa no clube." }), {
                                                                                                                                                                                          status: 403,
                                                                                                                                                                                                  headers: { "Content-Type": "application/json" }
                                                                                                                                                                                                        });
                                                                                                                                                                                                            }

                                                                                                                                                                                                                // 6. Cria um Token único de sessão e define a expiração para 7 dias
                                                                                                                                                                                                                    const token = crypto.randomUUID();
                                                                                                                                                                                                                        const expiraEm = new Date();
                                                                                                                                                                                                                            expiraEm.setDate(expiraEm.getDate() + 7);

                                                                                                                                                                                                                                // 7. Grava a sessão na tabela 'sessoes' que você acabou de criar no schema.sql
                                                                                                                                                                                                                                    await env.DB.prepare(
                                                                                                                                                                                                                                          "INSERT INTO sessoes (token, usuario_id, tipo_usuario, expira_em) VALUES (?, ?, ?, ?)"
                                                                                                                                                                                                                                              ).bind(token, membro.id, "membro", expiraEm.toISOString()).run();

                                                                                                                                                                                                                                                  // 8. Define o cookie de segurança para o navegador do celular do usuário
                                                                                                                                                                                                                                                      const cookie = `auth_token=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800`;

                                                                                                                                                                                                                                                          return new Response(JSON.stringify({ 
                                                                                                                                                                                                                                                                success: true, 
                                                                                                                                                                                                                                                                      message: "Login realizado com sucesso!",
                                                                                                                                                                                                                                                                            user: { nome: membro.nome, codigo: membro.codigo }
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
