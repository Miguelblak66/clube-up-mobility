# Clube UP Mobility — V27

V27 parte da V26 e foca em segurança/preparação para produção.

## Incluído
- Página pública preservada.
- Login de parceiro bloqueado quando a empresa está inativa.
- Troca de senha do parceiro com PBKDF2-SHA256 (120.000 iterações).
- Registro de ações de segurança em `audit_logs`.
- Headers de segurança em `_headers`.
- Sessões com cookie HttpOnly/Secure/SameSite=Strict e expiração já existente no projeto.
- Cadastro público mantém aceite de uso de dados/termos já presente na página.

## Configuração
No Cloudflare Pages/Workers, mantenha os segredos separados:
- ADMIN_PASSWORD
- ADMIN_SECRET
- PARTNER_SECRET
- MEMBER_SECRET

Configure o binding D1 como `DB` e execute o `schema.sql` completo.

## Observação
A recuperação de senha por e-mail/SMS depende de um provedor de envio e não foi simulada nesta versão. Não há envio automático de código nesta V27.

Antes de uso real, revise os Termos e a Política de Privacidade com orientação jurídica adequada à operação.
