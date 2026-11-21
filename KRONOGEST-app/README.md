# Kronogeste — Gestão de obras

React (Vite + Tailwind) + Express + Supabase. Módulos: Painel da obra (curva S, cronograma, fotos, relatório para impressão), Obras, Medições, Financeiro, Fornecedores (pedidos e avaliações), Cronograma (com planejamento reverso) e Dashboard. Login por e-mail/senha, PWA instalável.

## Testar agora, sem banco (modo demonstração)
Sem as variáveis do Supabase o app abre em modo demonstração, com dados de exemplo; qualquer e-mail e senha (6+ caracteres) entram.

    npm install
    npm run build
    npm start        # http://localhost:3000

## Ligar ao Supabase
1. No Supabase, abra **SQL Editor** e rode, nesta ordem, o conteúdo de `supabase/migrations/0001_init.sql`, `0002_signup.sql`, `0003_fotos.sql` e `0004_permissoes.sql`.
2. Em **Project Settings > API**, copie a *Project URL* e a chave *anon public*.
3. Crie `web/.env` (modelo em `web/.env.example`) com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, e rode `npm run build`.
4. Em **Authentication > Providers**, deixe e-mail ativo. Para testar sem confirmar e-mail, desative "Confirm email".
5. O primeiro usuário que criar conta cria a empresa e vira **admin**. Mantenha **Confirm email** ativo em produção.
6. Para convidar alguém para a mesma empresa (papéis: admin, engenheiro, financeiro, compras, leitura), rode no SQL Editor, logado como o projeto (service role):

       insert into convites (empresa_id, email, papel)
       values ('ID-DA-EMPRESA', 'pessoa@empresa.com', 'engenheiro');

   Quando essa pessoa criar a conta com esse e-mail, entra na sua empresa com o papel indicado. O ID da empresa está na tabela `empresas`.

## Deploy no Render (plano free)
- Suba os arquivos para o GitHub (sem `node_modules`).
- Novo **Web Service**: *Build Command* `npm install && npm run build`; *Start Command* `npm start`.
- Em **Environment**, adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (precisam existir antes do build).

## Testes
    npm install && npm test              # regras, banco/RLS (Postgres real em WASM) e servidor
    npm run build && npm test            # o teste do servidor precisa do front compilado
    npm run test:web                     # telas (Vitest + Testing Library)

## Nome e identidade
O nome fica em `web/src/config.js` (`APP_NAME`), em `web/public/manifest.json` e em `web/index.html`. Cores em `web/src/index.css`.
