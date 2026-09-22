import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildWorkbookBuffer, type SheetColumn } from "@/lib/spreadsheet";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const { data: sheet, error: sheetError } = await supabase
    .from("sheets")
    .select("*")
    .eq("id", id)
    .single();

  if (sheetError || !sheet) {
    return NextResponse.json(
      { error: "Planilha não encontrada." },
      { status: 404 },
    );
  }

  const { data: rows, error: rowsError } = await supabase
    .from("sheet_rows")
    .select("data")
    .eq("sheet_id", id)
    .order("row_index", { ascending: true });

  if (rowsError) {
    return NextResponse.json({ error: rowsError.message }, { status: 500 });
  }

  const buffer = await buildWorkbookBuffer(
    sheet.columns as SheetColumn[],
    (rows ?? []).map((r) => r.data as Record<string, unknown>),
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(sheet.name)}.xlsx"`,
    },
  });
}
