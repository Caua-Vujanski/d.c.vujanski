-- Lixeira: planilhas "excluidas" ficam marcadas com deleted_at em vez de
-- serem removidas na hora, permitindo restaurar ou excluir definitivamente.

alter table public.sheets
  add column if not exists deleted_at timestamptz;

comment on column public.sheets.deleted_at is 'Quando não nulo, a planilha está na lixeira.';
