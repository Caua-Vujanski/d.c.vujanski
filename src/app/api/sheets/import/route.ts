import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { parseSpreadsheet } from "@/lib/spreadsheet";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = [".xlsx", ".xls", ".csv"];

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const name = (formData.get("name") as string | null)?.trim();

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Arquivo não enviado." },
      { status: 400 },
    );
  }

  const lowerName = file.name.toLowerCase();
  if (!ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext))) {
    return NextResponse.json(
      { error: "Formato não suportado. Envie .xlsx, .xls ou .csv." },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Arquivo muito grande (máximo 10MB)." },
      { status: 400 },
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let parsed;
  try {
    parsed = await parseSpreadsheet(buffer, file.name);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao ler a planilha.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { data: sheet, error: insertError } = await supabase
    .from("sheets")
    .insert({
      owner_id: user.id,
      name: name || file.name.replace(/\.[^.]+$/, ""),
      original_filename: file.name,
      columns: parsed.columns,
      row_count: parsed.rows.length,
    })
    .select()
    .single();

  if (insertError || !sheet) {
    return NextResponse.json(
      { error: insertError?.message ?? "Falha ao salvar a planilha." },
      { status: 500 },
    );
  }

  const storagePath = `${user.id}/${sheet.id}/${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("spreadsheets")
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (!uploadError) {
    await supabase
      .from("sheets")
      .update({ storage_path: storagePath })
      .eq("id", sheet.id);
  }

  if (parsed.rows.length > 0) {
    const rowsToInsert = parsed.rows.map((data, index) => ({
      sheet_id: sheet.id,
      row_index: index,
      data,
    }));

    const CHUNK_SIZE = 500;
    for (let i = 0; i < rowsToInsert.length; i += CHUNK_SIZE) {
      const chunk = rowsToInsert.slice(i, i + CHUNK_SIZE);
      const { error: rowsError } = await supabase
        .from("sheet_rows")
        .insert(chunk);
      if (rowsError) {
        return NextResponse.json(
          { error: `Falha ao importar linhas: ${rowsError.message}` },
          { status: 500 },
        );
      }
    }
  }

  return NextResponse.json({ sheet }, { status: 201 });
}
