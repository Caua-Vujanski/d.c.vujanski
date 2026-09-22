-- Schema inicial: planilhas armazenadas como metadados + linhas editáveis (jsonb),
-- o que permite colunas arbitrárias por planilha sem precisar criar tabelas dinâmicas.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tabela: sheets (metadados de cada planilha importada)
-- ---------------------------------------------------------------------------
create table if not exists public.sheets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name text not null,
  original_filename text,
  storage_path text,
  columns jsonb not null default '[]'::jsonb,
  row_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.sheets is 'Metadados de cada planilha importada (nome, colunas, arquivo original no storage).';
comment on column public.sheets.columns is 'Definição das colunas (ordem e nomes) na forma [{"key": "col_1", "label": "Nome"}, ...].';
comment on column public.sheets.storage_path is 'Caminho do arquivo original (.xlsx/.csv) no bucket "spreadsheets".';

-- ---------------------------------------------------------------------------
-- Tabela: sheet_rows (cada linha da planilha, editável individualmente)
-- ---------------------------------------------------------------------------
create table if not exists public.sheet_rows (
  id uuid primary key default gen_random_uuid(),
  sheet_id uuid not null references public.sheets (id) on delete cascade,
  row_index integer not null,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (sheet_id, row_index)
);

comment on table public.sheet_rows is 'Uma linha de dados de uma planilha, no formato {"col_1": "valor", ...}.';

create index if not exists sheet_rows_sheet_id_idx on public.sheet_rows (sheet_id);

-- ---------------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sheets_set_updated_at on public.sheets;
create trigger sheets_set_updated_at
  before update on public.sheets
  for each row execute function public.set_updated_at();

drop trigger if exists sheet_rows_set_updated_at on public.sheet_rows;
create trigger sheet_rows_set_updated_at
  before update on public.sheet_rows
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: cada usuário só acessa as próprias planilhas
-- ---------------------------------------------------------------------------
alter table public.sheets enable row level security;
alter table public.sheet_rows enable row level security;

drop policy if exists "sheets_select_own" on public.sheets;
create policy "sheets_select_own" on public.sheets
  for select using (owner_id = auth.uid());

drop policy if exists "sheets_insert_own" on public.sheets;
create policy "sheets_insert_own" on public.sheets
  for insert with check (owner_id = auth.uid());

drop policy if exists "sheets_update_own" on public.sheets;
create policy "sheets_update_own" on public.sheets
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "sheets_delete_own" on public.sheets;
create policy "sheets_delete_own" on public.sheets
  for delete using (owner_id = auth.uid());

drop policy if exists "sheet_rows_select_own" on public.sheet_rows;
create policy "sheet_rows_select_own" on public.sheet_rows
  for select using (
    exists (
      select 1 from public.sheets s
      where s.id = sheet_rows.sheet_id and s.owner_id = auth.uid()
    )
  );

drop policy if exists "sheet_rows_insert_own" on public.sheet_rows;
create policy "sheet_rows_insert_own" on public.sheet_rows
  for insert with check (
    exists (
      select 1 from public.sheets s
      where s.id = sheet_rows.sheet_id and s.owner_id = auth.uid()
    )
  );

drop policy if exists "sheet_rows_update_own" on public.sheet_rows;
create policy "sheet_rows_update_own" on public.sheet_rows
  for update using (
    exists (
      select 1 from public.sheets s
      where s.id = sheet_rows.sheet_id and s.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.sheets s
      where s.id = sheet_rows.sheet_id and s.owner_id = auth.uid()
    )
  );

drop policy if exists "sheet_rows_delete_own" on public.sheet_rows;
create policy "sheet_rows_delete_own" on public.sheet_rows
  for delete using (
    exists (
      select 1 from public.sheets s
      where s.id = sheet_rows.sheet_id and s.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Storage: bucket privado para os arquivos originais (.xlsx/.csv)
-- Convenção de caminho: "<user_id>/<sheet_id>/<nome_do_arquivo>"
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('spreadsheets', 'spreadsheets', false)
on conflict (id) do nothing;

drop policy if exists "spreadsheets_select_own" on storage.objects;
create policy "spreadsheets_select_own" on storage.objects
  for select using (
    bucket_id = 'spreadsheets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "spreadsheets_insert_own" on storage.objects;
create policy "spreadsheets_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'spreadsheets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "spreadsheets_update_own" on storage.objects;
create policy "spreadsheets_update_own" on storage.objects
  for update using (
    bucket_id = 'spreadsheets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "spreadsheets_delete_own" on storage.objects;
create policy "spreadsheets_delete_own" on storage.objects
  for delete using (
    bucket_id = 'spreadsheets'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
