import ExcelJS from "exceljs";
import { Readable } from "stream";

export interface SheetColumn {
  key: string;
  label: string;
}

export interface SheetMerge {
  top: number;
  left: number;
  bottom: number;
  right: number;
}

export interface ParsedGridSheet {
  name: string;
  // grid[rowIndex][colIndex], ambos 0-based; pode ter buracos em linhas/colunas vazias.
  grid: unknown[][];
  rowCount: number;
  colCount: number;
  merges: SheetMerge[];
}

export interface ParsedWorkbook {
  sheets: ParsedGridSheet[];
}

// Limites defensivos: um arquivo malicioso/gigante não deve travar o servidor.
const MAX_ROWS = 20000;
const MAX_COLUMNS = 200;
const MAX_SHEETS = 50;

export async function parseWorkbook(
  buffer: Buffer,
  filename: string,
): Promise<ParsedWorkbook> {
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

  const sheets = workbook.worksheets
    .slice(0, MAX_SHEETS)
    .map((worksheet) => parseWorksheet(worksheet));

  if (sheets.length === 0) {
    throw new Error("Planilha vazia ou em formato não suportado.");
  }

  return { sheets };
}

function parseWorksheet(worksheet: ExcelJS.Worksheet): ParsedGridSheet {
  const grid: unknown[][] = [];
  let colCount = 0;

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const rowIndex = rowNumber - 1;
    if (rowIndex >= MAX_ROWS) return;

    const rowValues: unknown[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const colIndex = colNumber - 1;
      if (colIndex >= MAX_COLUMNS) return;
      rowValues[colIndex] = cellToValue(cell);
    });
    grid[rowIndex] = rowValues;
    colCount = Math.max(colCount, rowValues.length);
  });

  colCount = Math.max(colCount, Math.min(worksheet.columnCount, MAX_COLUMNS));

  const merges: SheetMerge[] = [];
  for (const range of worksheet.model.merges ?? []) {
    const parsed = parseRange(range);
    if (parsed) merges.push(parsed);
  }

  return {
    name: worksheet.name || "Planilha",
    grid,
    rowCount: grid.length,
    colCount,
    merges,
  };
}

function parseRange(range: string): SheetMerge | null {
  const match = /^([A-Z]+)(\d+):([A-Z]+)(\d+)$/i.exec(range);
  if (!match) return null;
  const [, colA, rowA, colB, rowB] = match;
  return {
    left: colLetterToIndex(colA),
    top: Number(rowA) - 1,
    right: colLetterToIndex(colB),
    bottom: Number(rowB) - 1,
  };
}

function colLetterToIndex(letters: string): number {
  let index = 0;
  for (const ch of letters.toUpperCase()) {
    index = index * 26 + (ch.charCodeAt(0) - 64);
  }
  return index - 1;
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

export async function buildWorkbookBuffer(sheets: ParsedGridSheet[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  sheets.forEach((sheet) => {
    const worksheet = workbook.addWorksheet(sheet.name || "Planilha");
    sheet.grid.forEach((rowValues, rowIndex) => {
      if (!rowValues) return;
      const row = worksheet.getRow(rowIndex + 1);
      rowValues.forEach((value, colIndex) => {
        row.getCell(colIndex + 1).value = value as ExcelJS.CellValue;
      });
      row.commit();
    });
    sheet.merges.forEach((merge) => {
      worksheet.mergeCells(
        merge.top + 1,
        merge.left + 1,
        merge.bottom + 1,
        merge.right + 1,
      );
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
