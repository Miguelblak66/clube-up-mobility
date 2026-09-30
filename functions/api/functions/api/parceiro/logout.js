// functions/api/administrador/logout.js ou /parceiro/logout.js
export async function onRequestPost() {
  // Limpa o cookie definindo sua validade como expirada imediatamente
    const expireCookie = "auth_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT";

      return new Response(JSON.stringify({ success: true, message: "Logout efetuado com sucesso." }), {
          status: 200,
              headers: {
                    "Content-Type": "application/json",
                          "Set-Cookie": expireCookie
                              }
                                });
                                }
                                