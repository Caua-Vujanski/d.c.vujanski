import { NextResponse } from "next/server";
import type { IWorkbookData } from "@univerjs/core";
import { createClient } from "@/lib/supabase/server";
import { snapshotToSheets } from "@/lib/univer-sheet";

export async function PUT(
  request: Request,
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

  const body = await request.json().catch(() => null);
  const snapshot = body?.snapshot as IWorkbookData | undefined;

  if (!snapshot || typeof snapshot !== "object") {
    return NextResponse.json(
      { error: "Snapshot inválido." },
      { status: 400 },
    );
  }

  const totalRowCount = snapshotToSheets(snapshot).reduce(
    (sum, s) => sum + s.rowCount,
    0,
  );

  const { error: updateError } = await supabase
    .from("sheets")
    .update({ univer_data: snapshot, row_count: totalRowCount })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
