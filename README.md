# dcvujanski-system

Sistema de armazenamento e edição de planilhas. Next.js (App Router) + Supabase (Postgres + Auth + Storage).

## Como funciona

- Cada planilha importada (.xlsx/.xls/.csv) vira uma linha em `sheets` (nome, colunas, arquivo original) e cada linha de dados vira uma linha em `sheet_rows` (jsonb), editável individualmente pela grid.
- O arquivo original fica guardado no bucket `spreadsheets` do Supabase Storage, para histórico/download.
- RLS (Row Level Security) garante que cada usuário só vê e edita as próprias planilhas.
- A qualquer momento dá para exportar a planilha (dados atuais) de volta para `.xlsx`.

## Setup

1. Crie um projeto em [supabase.com](https://supabase.com).
2. No painel do Supabase, abra **SQL Editor** e rode o conteúdo de [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) — isso cria as tabelas, as policies de RLS e o bucket de storage.
3. Copie `.env.local.example` para `.env.local` e preencha com a URL e a `anon key` do projeto (**Project Settings > API**).
4. Instale as dependências e suba o servidor de desenvolvimento:

   ```bash
   npm install
   npm run dev
   ```

5. Acesse `http://localhost:3000` — você será redirecionado para `/login`. Crie uma conta (o Supabase envia um e-mail de confirmação por padrão) e comece a importar planilhas.

## Scripts

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — build de produção
- `npm run lint` — lint
