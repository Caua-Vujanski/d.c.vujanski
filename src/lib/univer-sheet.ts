import type { ICellData, IRange, IWorkbookData, IWorksheetData, LocaleType } from "@univerjs/core";
import type { ParsedGridSheet, ParsedWorkbook } from "./spreadsheet";

const CELL_TYPE_STRING = 1 as ICellData["t"];
const CELL_TYPE_NUMBER = 2 as ICellData["t"];
const PT_BR = "ptBR" as LocaleType;

function toCellData(value: unknown): ICellData {
  if (value === null || value === undefined || value === "") return { v: "" };
  if (typeof value === "number") return { v: value, t: CELL_TYPE_NUMBER };
  if (typeof value === "boolean") return { v: value };
  return { v: String(value), t: CELL_TYPE_STRING };
}

function sheetIdFor(workbookId: string, index: number): string {
  return `${workbookId}-sheet-${index}`;
}

// Constrói um workbook Univer preservando todas as abas da planilha original
// (em vez de achatar tudo numa única tabela com "linha 1 = cabeçalho").
export function buildInitialSnapshot(
  workbookId: string,
  workbookName: string,
  parsed: ParsedWorkbook,
): IWorkbookData {
  const sheetIds = parsed.sheets.map((_, index) => sheetIdFor(workbookId, index));

  const sheets: Record<string, Partial<IWorksheetData>> = {};
  parsed.sheets.forEach((sheet, index) => {
    const sheetId = sheetIds[index];
    sheets[sheetId] = buildWorksheetData(sheetId, sheet);
  });

  return {
    id: workbookId,
    name: workbookName,
    appVersion: "0.25.1",
    locale: PT_BR,
    styles: {},
    sheetOrder: sheetIds,
    sheets,
  };
}

function buildWorksheetData(sheetId: string, sheet: ParsedGridSheet): Partial<IWorksheetData> {
  const cellData: Record<number, Record<number, ICellData>> = {};

  sheet.grid.forEach((rowValues, rowIndex) => {
    if (!rowValues) return;
    const rowCells: Record<number, ICellData> = {};
    rowValues.forEach((value, colIndex) => {
      if (value === undefined) return;
      rowCells[colIndex] = toCellData(value);
    });
    cellData[rowIndex] = rowCells;
  });

  const mergeData: IRange[] = sheet.merges.map((merge) => ({
    startRow: merge.top,
    startColumn: merge.left,
    endRow: merge.bottom,
    endColumn: merge.right,
  }));

  return {
    id: sheetId,
    name: sheet.name,
    rowCount: Math.max(sheet.rowCount + 20, 100),
    columnCount: Math.max(sheet.colCount, 26),
    cellData,
    mergeData,
  };
}

// Extrai todas as abas do snapshot como grades brutas, para exportação fiel.
export function snapshotToSheets(snapshot: IWorkbookData): ParsedGridSheet[] {
  const sheetIds = snapshot.sheetOrder ?? [];

  return sheetIds.map((sheetId) => {
    const sheetData = snapshot.sheets?.[sheetId];
    const cellData = sheetData?.cellData ?? {};

    const rowIndexes = Object.keys(cellData).map(Number);
    const maxRow = rowIndexes.length ? Math.max(...rowIndexes) : -1;

    const grid: unknown[][] = [];
    let colCount = 0;
    for (let rowIndex = 0; rowIndex <= maxRow; rowIndex++) {
      const dataRow = cellData[rowIndex];
      if (!dataRow) continue;
      const colIndexes = Object.keys(dataRow).map(Number);
      if (colIndexes.length === 0) continue;
      const maxCol = Math.max(...colIndexes);
      const rowValues: unknown[] = [];
      colIndexes.forEach((colIndex) => {
        rowValues[colIndex] = dataRow[colIndex]?.v ?? null;
      });
      grid[rowIndex] = rowValues;
      colCount = Math.max(colCount, maxCol + 1);
    }

    const merges = (sheetData?.mergeData ?? []).map((range) => ({
      top: range.startRow,
      left: range.startColumn,
      bottom: range.endRow,
      right: range.endColumn,
    }));

    return {
      name: sheetData?.name ?? "Planilha",
      grid,
      rowCount: grid.length,
      colCount,
      merges,
    } satisfies ParsedGridSheet;
  });
}
