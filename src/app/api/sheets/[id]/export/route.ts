import { NextResponse } from "next/server";
import type { IWorkbookData } from "@univerjs/core";
import { createClient } from "@/lib/supabase/server";
import { buildWorkbookBuffer } from "@/lib/spreadsheet";
import { snapshotToSheets } from "@/lib/univer-sheet";

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

  const sheets = snapshotToSheets(sheet.univer_data as IWorkbookData);

  const buffer = await buildWorkbookBuffer(sheets);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(sheet.name)}.xlsx"`,
    },
  });
}
