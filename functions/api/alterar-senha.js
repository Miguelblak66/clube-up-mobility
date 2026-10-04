export async function onRequestPost(context) {
          try {
                  const { request, env } = context;

                          if (!env.DB) {
                                      return new Response(JSON.stringify({ error: "Banco de dados não configurado." }), {
                                                      status: 500,
                                                                      headers: { "Content-Type": "application/json" }
                                                                                  });
                                                                                          }

                                                                                                  // 1. 🔒 Verifica quem está tentando alterar a senha
                                                                                                          const cookieHeader = request.headers.get("Cookie") || "";
                                                                                                                  const cookies = Object.fromEntries(cookieHeader.split(";").map(c => c.trim().split("=")));
                                                                                                                          const token = cookies["auth_token"];

                                                                                                                                  if (!token) {
                                                                                                                                              return new Response(JSON.stringify({ error: "Acesso negado. Faça login primeiro." }), {
                                                                                                                                                              status: 401,
                                                                                                                                                                              headers: { "Content-Type": "application/json" }
                                                                                                                                                                                          });
                                                                                                                                                                                                  }

                                                                                                                                                                                                          // Busca a sessão ativa no banco
                                                                                                                                                                                                                  const sessao = await env.DB.prepare(
                                                                                                                                                                                                                              "SELECT * FROM sessoes WHERE token = ? AND datetime(expira_em) > datetime('now') LIMIT 1"
                                                                                                                                                                                                                                      ).bind(token).first();

                                                                                                                                                                                                                                              if (!sessao) {
                                                                                                                                                                                                                                                          return new Response(JSON.stringify({ error: "Sessão inválida ou expirada." }), {
                                                                                                                                                                                                                                                                          status: 401,
                                                                                                                                                                                                                                                                                          headers: { "Content-Type": "application/json" }
                                                                                                                                                                                                                                                                                                      });
                                                                                                                                                                                                                                                                                                              }
}