-- Adiciona a coluna que guarda o snapshot completo da planilha no formato
-- do Univer (motor de planilha com fórmulas usado no editor), substituindo
-- o grid simples anterior baseado em public.sheet_rows.

alter table public.sheets
  add column if not exists univer_data jsonb;

comment on column public.sheets.univer_data is 'Snapshot IWorkbookData do Univer (planilha completa: células, fórmulas, formatação).';
