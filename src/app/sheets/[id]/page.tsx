import { notFound } from "next/navigation";
import Link from "next/link";
import type { IWorkbookData } from "@univerjs/core";
import { createClient } from "@/lib/supabase/server";
import type { SheetColumn } from "@/lib/spreadsheet";
import { buildInitialSnapshot } from "@/lib/univer-sheet";
import { UniverSheetEditor } from "./univer-sheet-editor";

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

  let snapshot = sheet.univer_data as IWorkbookData | null;

  if (!snapshot) {
    const { data: legacyRows } = await supabase
      .from("sheet_rows")
      .select("data")
      .eq("sheet_id", id)
      .order("row_index", { ascending: true });

    snapshot = buildInitialSnapshot(
      sheet.id,
      sheet.name,
      (sheet.columns as SheetColumn[]) ?? [],
      (legacyRows ?? []).map((r) => r.data as Record<string, unknown>),
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 px-4 pt-3 pb-2 sm:px-6">
        <Link
          href="/sheets"
          className="mb-1 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-900"
        >
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Voltar
        </Link>
        <h1 className="truncate text-xl font-semibold text-brand-950">{sheet.name}</h1>
        <p className="text-xs text-gray-500">
          {sheet.original_filename} · {sheet.row_count} linhas
        </p>
      </div>

      <div className="min-h-0 flex-1 px-4 pb-4 sm:px-6">
        <UniverSheetEditor sheetId={sheet.id} initialSnapshot={snapshot} />
      </div>
    </div>
  );
}
