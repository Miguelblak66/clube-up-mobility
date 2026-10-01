export async function onRequestPost(context) {
      try {
          const { request, env } = context;

              if (!env.DB) {
                    return new Response(JSON.stringify({ error: "Banco de dados não configurado." }), { 
                            status: 500,
                                    headers: { "Content-Type": "application/json" }
                                          });
                                              }

                                                  // 1. 🔒 BLOCO DE SEGURANÇA: Verifica se quem está consultando é um parceiro ou admin logado
                                                      const cookieHeader = request.headers.get("Cookie") || "";
                                                          const cookies = Object.fromEntries(cookieHeader.split(";").map(c => c.trim().split("=")));
                                                              const token = cookies["auth_token"];

                                                                  if (!token) {
                                                                        return new Response(JSON.stringify({ error: "Acesso negado. Faça login primeiro." }), { 
                                                                                status: 401,
                                                                                        headers: { "Content-Type": "application/json" }
                                                                                              });
                                                                                                  }

                                                                                                      const sessao = await env.DB.prepare(
                                                                                                            "SELECT * FROM sessoes WHERE token = ? AND datetime(expira_em) > datetime('now') LIMIT 1"
                                                                                                                ).bind(token).first();

                                                                                                                    if (!sessao || (sessao.tipo_usuario !== "parceiro" && sessao.tipo_usuario !== "admin")) {
                                                                                                                          return new Response(JSON.stringify({ error: "Acesso restrito para parceiros e administradores." }), { 
                                                                                                                                  status: 403,
                                                                                                                                          headers: { "Content-Type": "application/json" }
                                                                                                                                                });
                                                                                                                                                    }

                                                                                                                                                        // 2. Captura o código do membro enviado para a consulta
                                                                                                                                                            const { codigoMembro } = await request.json();

                                                                                                                                                                if (!codigoMembro) {
                                                                                                                                                                      return new Response(JSON.stringify({ error: "O código do membro é obrigatório para a consulta." }), { 
                                                                                                                                                                              status: 400,
                                                                                                                                                                                      headers: { "Content-Type": "application/json" }
                                                                                                                                                                                            });
                                                                                                                                                                                                }

                                                                                                                                                                                                    // 3. Busca o membro no banco de dados pela sua tabela 'club_members'
                                                                                                                                                                                                        const membro = await env.DB.prepare(
                                                                                                                                                                                                              "SELECT id, codigo, nome, status FROM club_members WHERE codigo = ? LIMIT 1"
                                                                                                                                                                                                                  ).bind(codigoMembro).first();

                                                                                                                                                                                                                      if (!membro) {
                                                                                                                                                                                                                            return new Response(JSON.stringify({ found: false, error: "Membro não encontrado no clube." }), { 
                                                                                                                                                                                                                                    status: 404,
                                                                                                                                                                                                                                            headers: { "Content-Type": "application/json" }
                                                                                                                                                                                                                                                  });
                                                                                                                                                                                                                                                      }

                                                                                                                                                                                                                                                          // 4. Retorna se o membro está ativo ou se possui alguma restrição
                                                                                                                                                                                                                                                              return new Response(JSON.stringify({
                                                                                                                                                                                                                                                                    found: true,
                                                                                                                                                                                                                                                                          member: {
                                                                                                                                                                                                                                                                                  codigo: membro.codigo,
                                                                                                                                                                                                                                                                                          nome: membro.nome,
                                                                                                                                                                                                                                                                                                  status: membro.status,
                                                                                                                                                                                                                                                                                                          pode_usar_beneficio: membro.status === "ativo"
                                                                                                                                                                                                                                                                                                                }
                                                                                                                                                                                                                                                                                                                    }), {
                                                                                                                                                                                                                                                                                                                          status: 200,
                                                                                                                                                                                                                                                                                                                                headers: { "Content-Type": "application/json" }
                                                                                                                                                                                                                                                                                                                                    });

                                                                                                                                                                                                                                                                                                                                      } catch (error) {
                                                                                                                                                                                                                                                                                                                                          return new Response(JSON.stringify({ error: "Erro ao consultar membro: " + error.message }), { 
                                                                                                                                                                                                                                                                                                                                                status: 500,
                                                                                                                                                                                                                                                                                                                                                      headers: { "Content-Type": "application/json" }
                                                                                                                                                                                                                                                                                                                                                          });
                                                                                                                                                                                                                                                                                                                                                            }
                                                                                                                                                                                                                                                                                                                                                            }
                                                                                                                                                                                                                                                                                                                                                            
}