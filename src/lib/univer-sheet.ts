import type { ICellData, IWorkbookData, LocaleType } from "@univerjs/core";
import type { SheetColumn } from "./spreadsheet";

const CELL_TYPE_STRING = 1 as ICellData["t"];
const CELL_TYPE_NUMBER = 2 as ICellData["t"];
const PT_BR = "ptBR" as LocaleType;

function toCellData(value: unknown): ICellData {
  if (value === null || value === undefined) return { v: "" };
  if (typeof value === "number") return { v: value, t: CELL_TYPE_NUMBER };
  if (typeof value === "boolean") return { v: value };
  return { v: String(value), t: CELL_TYPE_STRING };
}

export function buildInitialSnapshot(
  sheetId: string,
  sheetName: string,
  columns: SheetColumn[],
  rows: Record<string, unknown>[],
): IWorkbookData {
  const cellData: Record<number, Record<number, ICellData>> = {
    0: Object.fromEntries(
      columns.map((col, colIndex) => [
        colIndex,
        { v: col.label, t: CELL_TYPE_STRING } satisfies ICellData,
      ]),
    ),
  };

  rows.forEach((row, rowIndex) => {
    cellData[rowIndex + 1] = Object.fromEntries(
      columns.map((col, colIndex) => [colIndex, toCellData(row[col.key])]),
    );
  });

  return {
    id: sheetId,
    name: sheetName,
    appVersion: "0.25.1",
    locale: PT_BR,
    styles: {},
    sheetOrder: [sheetId],
    sheets: {
      [sheetId]: {
        id: sheetId,
        name: sheetName,
        rowCount: Math.max(rows.length + 1, 100),
        columnCount: Math.max(columns.length, 26),
        cellData,
      },
    },
  };
}

export function snapshotToColumnsAndRows(snapshot: IWorkbookData): {
  columns: SheetColumn[];
  rows: Record<string, unknown>[];
} {
  const sheetId = snapshot.sheetOrder?.[0];
  const cellData = (sheetId && snapshot.sheets?.[sheetId]?.cellData) || {};

  const rowIndexes = Object.keys(cellData)
    .map(Number)
    .sort((a, b) => a - b);

  if (rowIndexes.length === 0) return { columns: [], rows: [] };

  const headerRowIndex = rowIndexes[0];
  const headerRow = cellData[headerRowIndex] ?? {};
  const colIndexes = Object.keys(headerRow)
    .map(Number)
    .sort((a, b) => a - b);

  const columns: SheetColumn[] = colIndexes.map((colIndex, i) => ({
    key: `col_${i + 1}`,
    label: String(headerRow[colIndex]?.v ?? `Coluna ${i + 1}`),
  }));

  const rows: Record<string, unknown>[] = [];
  rowIndexes.slice(1).forEach((rowIndex) => {
    const dataRow = cellData[rowIndex];
    if (!dataRow) return;
    const rowData: Record<string, unknown> = {};
    let hasValue = false;
    columns.forEach((col, i) => {
      const value = dataRow[colIndexes[i]]?.v ?? null;
      if (value !== null && value !== "") hasValue = true;
      rowData[col.key] = value;
    });
    if (hasValue) rows.push(rowData);
  });

  return { columns, rows };
}
