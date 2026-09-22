import ExcelJS from "exceljs";
import { Readable } from "stream";

export interface SheetColumn {
  key: string;
  label: string;
}

export interface ParsedSheet {
  columns: SheetColumn[];
  rows: Record<string, unknown>[];
}

// Limites defensivos: um arquivo malicioso/gigante não deve travar o servidor.
const MAX_ROWS = 20000;
const MAX_COLUMNS = 200;

export async function parseSpreadsheet(
  buffer: Buffer,
  filename: string,
): Promise<ParsedSheet> {
  const workbook = new ExcelJS.Workbook();
  const lower = filename.toLowerCase();

  if (lower.endsWith(".csv")) {
    await workbook.csv.read(Readable.from(buffer));
  } else {
    // exceljs declara seu próprio `Buffer` ambiente incompatível com o
    // Buffer genérico do @types/node atual — cast local para contornar.
    await workbook.xlsx.load(
      buffer as unknown as Parameters<typeof workbook.xlsx.load>[0],
    );
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error("Planilha vazia ou em formato não suportado.");
  }

  const headerRow = worksheet.getRow(1);
  const columns: SheetColumn[] = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    if (colNumber > MAX_COLUMNS) return;
    const label = cell.text?.trim() || `Coluna ${colNumber}`;
    columns.push({ key: `col_${colNumber}`, label });
  });

  if (columns.length === 0) {
    throw new Error(
      "Não foi possível identificar cabeçalhos na primeira linha.",
    );
  }

  const rows: Record<string, unknown>[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    if (rows.length >= MAX_ROWS) return;

    const rowData: Record<string, unknown> = {};
    let hasValue = false;
    columns.forEach((col, index) => {
      const cell = row.getCell(index + 1);
      const value = cellToValue(cell);
      if (value !== null && value !== "") hasValue = true;
      rowData[col.key] = value;
    });
    if (hasValue) rows.push(rowData);
  });

  return { columns, rows };
}

function cellToValue(cell: ExcelJS.Cell): string | number | boolean | null {
  const value = cell.value;
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("text" in value) return String((value as { text: unknown }).text);
    if ("result" in value) {
      const result = (value as { result: unknown }).result;
      if (typeof result === "string" || typeof result === "number" || typeof result === "boolean") {
        return result;
      }
      return result === null || result === undefined ? null : String(result);
    }
    return String(value);
  }
  return value;
}

export async function buildWorkbookBuffer(
  columns: SheetColumn[],
  rows: Record<string, unknown>[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Planilha");

  worksheet.columns = columns.map((col) => ({
    header: col.label,
    key: col.key,
    width: 20,
  }));
  rows.forEach((row) => worksheet.addRow(row));

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
