import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SheetColumn } from "@/lib/spreadsheet";
import { SheetGrid } from "./sheet-grid";

export const dynamic = "force-dynamic";

export default async function SheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: sheet } = await supabase
    .from("sheets")
    .select("*")
    .eq("id", id)
    .single();

  if (!sheet) notFound();

  const { data: rows } = await supabase
    .from("sheet_rows")
    .select("id, row_index, data")
    .eq("sheet_id", id)
    .order("row_index", { ascending: true });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{sheet.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {sheet.original_filename} · {rows?.length ?? 0} linhas
          </p>
        </div>
        <a
          href={`/api/sheets/${sheet.id}/export`}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Exportar .xlsx
        </a>
      </div>

      <SheetGrid
        sheetId={sheet.id}
        columns={sheet.columns as SheetColumn[]}
        initialRows={rows ?? []}
      />
    </div>
  );
}
