# Validação local e scripts de diagnóstico

Esta pasta contém scripts para preparar um banco SQLite local (local.db) com o schema do projeto e executar um teste rápido (smoke test) que valida os endpoints principais (cadastro, login e perfil).

Requisitos locais
- node (>=16)
- sqlite3 (CLI)
- curl
- (opcional) jq (para saída JSON legível no smoke test)

Variáveis de ambiente
- ALLOWED_ORIGINS: lista de origens permitidas para CORS separadas por vírgula. Exemplo:
  export ALLOWED_ORIGINS="http://localhost:8788,https://app.exemplo.com"
- API_URL: URL base do ambiente local para smoke tests. Padrão: http://localhost:8788

Passos para validar localmente

1) Criar o banco local

  ./scripts/create_local_db.sh

2) Criar um administrador (opcional)

  ./scripts/insert_admin.sh admin@example.com "SuaSenha" "Nome do Admin"

  O script usa tools/hash_password.js para gerar salt + hash PBKDF2 compatível com o Workers.

3) Executar o servidor de desenvolvimento do Cloudflare Pages/Workers

  ALLOWED_ORIGINS=http://localhost:8788 npx wrangler pages dev .

4) Em outro terminal, executar o smoke test

  ./scripts/smoke_test.sh

Observações
- Se você estiver usando Windows, execute os scripts via WSL ou adapte-os para PowerShell.
- O smoke test usa o endpoint padrão http://localhost:8788; ajuste a variável de ambiente API_URL se necessário.
- A tabela `login_attempts` foi adicionada para registrar tentativas falhas e bloquear brute force por e-mail/IP em 15 minutos.
