export async function onRequestGet(context) {
    try {
        const { request, env } = context;

            if (!env.DB) {
                  return new Response(JSON.stringify({ error: "Banco de dados não configurado." }), { status: 500 });
                      }

                          // 🔒 BLOCO DE SEGURANÇA: Apenas administradores logados podem ver os relatórios
                              const cookieHeader = request.headers.get("Cookie") || "";
                                  const cookies = Object.fromEntries(cookieHeader.split(";").map(c => c.trim().split("=")));
                                      const token = cookies["auth_token"];

                                          if (!token) {
                                                return new Response(JSON.stringify({ error: "Acesso negado." }), { status: 401 });
                                                    }

                                                        const sessao = await env.DB.prepare(
                                                              "SELECT * FROM sessoes WHERE token = ? AND datetime(expira_em) > datetime('now') LIMIT 1"
                                                                  ).bind(token).first();

                                                                      if (!sessao || sessao.tipo_usuario !== "admin") {
                                                                            return new Response(JSON.stringify({ error: "Sessão inválida ou expirada." }), { status: 401 });
                                                                                }

                                                                                    // 📊 CONSULTAS DE RELATÓRIO: Conta os totais direto do banco de dados
                                                                                        
                                                                                            // 1. Total de Membros Ativos
                                                                                                const totalMembros = await env.DB.prepare(
                                                                                                      "SELECT COUNT(*) as total FROM club_members WHERE status = 'ativo'"
                                                                                                          ).first();

                                                                                                              // 2. Total de Parceiros Cadastrados
                                                                                                                  const totalParceiros = await env.DB.prepare(
                                                                                                                        "SELECT COUNT(*) as total FROM parceiros"
                                                                                                                            ).first();

                                                                                                                                // 3. Total de Sessões ativas de usuários no momento
                                                                                                                                    const sessoesAtivas = await env.DB.prepare(
                                                                                                                                          "SELECT COUNT(*) as total FROM sessoes WHERE datetime(expira_em) > datetime('now')"
                                                                                                                                              ).first();

                                                                                                                                                  // Retorna o compilado de métricas para o painel do administrador
                                                                                                                                                      return new Response(JSON.stringify({
                                                                                                                                                            success: true,
                                                                                                                                                                  data: {
                                                                                                                                                                          membros_ativos: totalMembros ? totalMembros.total : 0,
                                                                                                                                                                                  parceiros_cadastrados: totalParceiros ? totalParceiros.total : 0,
                                                                                                                                                                                          sessoes_ativas_no_momento: sessoesAtivas ? sessoesAtivas.total : 0,
                                                                                                                                                                                                  gerado_em: new Date().toISOString()
                                                                                                                                                                                                        }
                                                                                                                                                                                                            }), {
                                                                                                                                                                                                                  status: 200,
                                                                                                                                                                                                                        headers: { "Content-Type": "application/json" }
                                                                                                                                                                                                                            });

                                                                                                                                                                                                                              } catch (error) {
                                                                                                                                                                                                                                  return new Response(JSON.stringify({ error: "Erro ao gerar relatório: " + error.message }), { status: 500 });
                                                                                                                                                                                                                                    }
                                                                                                                                                                                                                                    }
                                                                                                                                                                                                                                    
}