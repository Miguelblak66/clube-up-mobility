export async function onRequestPost(context) {
      try {
          const { request, env } = context;

              if (!env.DB) {
                    return new Response(JSON.stringify({ error: "Banco de dados não configurado." }), { 
                            status: 500,
                                    headers: { "Content-Type": "application/json" }
                                          });
                                              }

                                                  // 1. Captura os dados digitados pelo usuário no formulário de cadastro
                                                      const { codigo, nome, email, telefone, password } = await request.json();

                                                          // Validação básica de campos obrigatórios
                                                              if (!codigo || !nome || !email || !password) {
                                                                    return new Response(JSON.stringify({ error: "Por favor, preencha todos os campos obrigatórios." }), { 
                                                                            status: 400,
                                                                                    headers: { "Content-Type": "application/json" }
                                                                                          });
                                                                                              }

                                                                                                  // 2. Validação de duplicidade: Verifica se o e-mail já está cadastrado no sistema
                                                                                                      const emailExistente = await env.DB.prepare(
                                                                                                            'SELECT id FROM club_members WHERE "e-mail" = ? LIMIT 1'
                                                                                                                ).bind(email).first();

                                                                                                                    if (emailExistente) {
                                                                                                                          return new Response(JSON.stringify({ error: "Este endereço de e-mail já está cadastrado no clube." }), { 
                                                                                                                                  status: 400,
                                                                                                                                          headers: { "Content-Type": "application/json" }
                                                                                                                                                });
                                                                                                                                                    }

                                                                                                                                                        // 3. Validação de duplicidade: Verifica se o código do membro já foi usado
                                                                                                                                                            const codigoExistente = await env.DB.prepare(
                                                                                                                                                                  'SELECT id FROM club_members WHERE codigo = ? LIMIT 1'
                                                                                                                                                                      ).bind(codigo).first();

                                                                                                                                                                          if (codigoExistente) {
                                                                                                                                                                                return new Response(JSON.stringify({ error: "Este código de membro já está em uso." }), { 
                                                                                                                                                                                        status: 400,
                                                                                                                                                                                                headers: { "Content-Type": "application/json" }
                                                                                                                                                                                                      });
                                                                                                                                                                                                          }

                                                                                                                                                                                                              // 4. Inserção no Banco: Insere o novo usuário na tabela 'club_members'
                                                                                                                                                                                                                  // O status padrão é definido como 'ativo' para liberar o acesso imediato
                                                                                                                                                                                                                      await env.DB.prepare(
                                                                                                                                                                                                                            'INSERT INTO club_members (codigo, nome, "e-mail", telefone, senha_hash, status) VALUES (?, ?, ?, ?, ?, ?)'
                                                                                                                                                                                                                                ).bind(codigo, nome, email, telefone || null, password, "ativo").run();

                                                                                                                                                                                                                                    return new Response(JSON.stringify({ 
                                                                                                                                                                                                                                          success: true, 
                                                                                                                                                                                                                                                message: "Sua conta no clube foi criada com sucesso! Prossiga para o login." 
                                                                                                                                                                                                                                                    }), {
                                                                                                                                                                                                                                                          status: 201,
                                                                                                                                                                                                                                                                headers: { "Content-Type": "application/json" }
                                                                                                                                                                                                                                                                    });

                                                                                                                                                                                                                                                                      } catch (error) {
                                                                                                                                                                                                                                                                          return new Response(JSON.stringify({ error: "Erro ao processar o cadastro: " + error.message }), { 
                                                                                                                                                                                                                                                                                status: 500,
                                                                                                                                                                                                                                                                                      headers: { "Content-Type": "application/json" }
                                                                                                                                                                                                                                                                                          });
                                                                                                                                                                                                                                                                                            }
                                                                                                                                                                                                                                                                                            }
                                                                                                                                                                                                                                                                                            
}