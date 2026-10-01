export async function onRequestPost(context) {
      try {
          const { request, env } = context;

              // 1. Verifica se o banco de dados está disponível
                  if (!env.DB) {
                        return new Response(JSON.stringify({ error: "Banco de dados não configurado." }), { status: 500 });
                            }

                                // 2. Captura o cookie de autenticação do navegador do usuário
                                    const cookieHeader = request.headers.get("Cookie") || "";
                                        const cookies = Object.fromEntries(cookieHeader.split(";").map(c => c.trim().split("=")));
                                            const token = cookies["auth_token"];

                                                // 3. Se houver um token ativo, remove ele da tabela 'sessoes' do banco
                                                    if (token) {
                                                          await env.DB.prepare("DELETE FROM sessoes WHERE token = ?").bind(token).run();
                                                              }

                                                                  // 4. Limpa o cookie no celular do usuário forçando a expiração dele
                                                                      const expireCookie = "auth_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT";

                                                                          return new Response(JSON.stringify({ success: true, message: "Desconectado com sucesso." }), {
                                                                                status: 200,
                                                                                      headers: {
                                                                                              "Content-Type": "application/json",
                                                                                                      "Set-Cookie": expireCookie
                                                                                                            }
                                                                                                                });
                                                                                                                  } catch (error) {
                                                                                                                      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
                                                                                                                        }
                                                                                                                        }
                                                                                                                        
}
