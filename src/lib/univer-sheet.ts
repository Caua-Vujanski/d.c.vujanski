import {
  BooleanNumber,
  HorizontalAlign,
  VerticalAlign,
  type ICellData,
  type IColumnData,
  type IRange,
  type IRowData,
  type IStyleData,
  type IWorkbookData,
  type IWorksheetData,
  type LocaleType,
} from "@univerjs/core";
import type { CellStyle, ParsedGridSheet, ParsedWorkbook } from "./spreadsheet";

const CELL_TYPE_STRING = 1 as ICellData["t"];
const CELL_TYPE_NUMBER = 2 as ICellData["t"];
const PT_BR = "ptBR" as LocaleType;

function toCellData(
  value: unknown,
  style: CellStyle | undefined,
  formula: string | undefined,
): ICellData {
  const s = style ? cellStyleToIStyleData(style) : undefined;
  const f = formula ? `=${formula}` : undefined;

  let base: ICellData;
  if (value === null || value === undefined || value === "") {
    base = { v: "" };
  } else if (typeof value === "number") {
    base = { v: value, t: CELL_TYPE_NUMBER };
  } else if (typeof value === "boolean") {
    base = { v: value };
  } else {
    base = { v: String(value), t: CELL_TYPE_STRING };
  }

  if (s) base.s = s;
  if (f) base.f = f;
  return base;
}

function sheetIdFor(workbookId: string, index: number): string {
  return `${workbookId}-sheet-${index}`;
}

const HORIZONTAL_ALIGN_MAP: Record<NonNullable<CellStyle["horizontalAlign"]>, HorizontalAlign> = {
  left: HorizontalAlign.LEFT,
  center: HorizontalAlign.CENTER,
  right: HorizontalAlign.RIGHT,
  justify: HorizontalAlign.JUSTIFIED,
};

const VERTICAL_ALIGN_MAP: Record<NonNullable<CellStyle["verticalAlign"]>, VerticalAlign> = {
  top: VerticalAlign.TOP,
  middle: VerticalAlign.MIDDLE,
  bottom: VerticalAlign.BOTTOM,
};

function cellStyleToIStyleData(style: CellStyle): IStyleData {
  const result: IStyleData = {};
  if (style.bold) result.bl = BooleanNumber.TRUE;
  if (style.italic) result.it = BooleanNumber.TRUE;
  if (style.underline) result.ul = { s: BooleanNumber.TRUE };
  if (style.strike) result.st = { s: BooleanNumber.TRUE };
  if (style.fontSize) result.fs = style.fontSize;
  if (style.fontFamily) result.ff = style.fontFamily;
  if (style.fontColor) result.cl = { rgb: style.fontColor };
  if (style.backgroundColor) result.bg = { rgb: style.backgroundColor };
  if (style.horizontalAlign) result.ht = HORIZONTAL_ALIGN_MAP[style.horizontalAlign];
  if (style.verticalAlign) result.vt = VERTICAL_ALIGN_MAP[style.verticalAlign];
  if (style.numberFormat) result.n = { pattern: style.numberFormat };
  return result;
}

function istyleDataToCellStyle(s: IStyleData): CellStyle | undefined {
  const style: CellStyle = {};
  if (s.bl === BooleanNumber.TRUE) style.bold = true;
  if (s.it === BooleanNumber.TRUE) style.italic = true;
  if (s.ul?.s === BooleanNumber.TRUE) style.underline = true;
  if (s.st?.s === BooleanNumber.TRUE) style.strike = true;
  if (s.fs) style.fontSize = s.fs;
  if (s.ff) style.fontFamily = s.ff;
  if (s.cl?.rgb) style.fontColor = s.cl.rgb;
  if (s.bg?.rgb) style.backgroundColor = s.bg.rgb;
  if (s.ht === HorizontalAlign.LEFT) style.horizontalAlign = "left";
  else if (s.ht === HorizontalAlign.CENTER) style.horizontalAlign = "center";
  else if (s.ht === HorizontalAlign.RIGHT) style.horizontalAlign = "right";
  else if (s.ht === HorizontalAlign.JUSTIFIED) style.horizontalAlign = "justify";
  if (s.vt === VerticalAlign.TOP) style.verticalAlign = "top";
  else if (s.vt === VerticalAlign.MIDDLE) style.verticalAlign = "middle";
  else if (s.vt === VerticalAlign.BOTTOM) style.verticalAlign = "bottom";
  if (s.n?.pattern) style.numberFormat = s.n.pattern;
  return Object.keys(style).length > 0 ? style : undefined;
}

// Resolve o estilo de uma célula: pode vir inline (import inicial) ou como
// referência a `snapshot.styles` (depois que o Univer normaliza no editor).
function resolveStyle(
  snapshot: IWorkbookData,
  s: ICellData["s"],
): CellStyle | undefined {
  if (!s) return undefined;
  const styleData = typeof s === "string" ? snapshot.styles?.[s] : s;
  return styleData ? istyleDataToCellStyle(styleData) : undefined;
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
      const style = sheet.styles[rowIndex]?.[colIndex];
      const formula = sheet.formulas[rowIndex]?.[colIndex];
      if (value === null && !style && !formula) return;
      rowCells[colIndex] = toCellData(value, style, formula);
    });
    cellData[rowIndex] = rowCells;
  });

  const mergeData: IRange[] = sheet.merges.map((merge) => ({
    startRow: merge.top,
    startColumn: merge.left,
    endRow: merge.bottom,
    endColumn: merge.right,
  }));

  const columnData: Record<number, Partial<IColumnData>> = {};
  Object.entries(sheet.columnWidths).forEach(([colIndex, width]) => {
    columnData[Number(colIndex)] = { w: width };
  });

  const rowData: Record<number, Partial<IRowData>> = {};
  Object.entries(sheet.rowHeights).forEach(([rowIndex, height]) => {
    rowData[Number(rowIndex)] = { h: height };
  });

  return {
    id: sheetId,
    name: sheet.name,
    rowCount: Math.max(sheet.rowCount + 20, 100),
    columnCount: Math.max(sheet.colCount, 26),
    cellData,
    mergeData,
    columnData,
    rowData,
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
    const styles: Record<number, Record<number, CellStyle>> = {};
    const formulas: Record<number, Record<number, string>> = {};
    let colCount = 0;
    for (let rowIndex = 0; rowIndex <= maxRow; rowIndex++) {
      const dataRow = cellData[rowIndex];
      if (!dataRow) continue;
      const colIndexes = Object.keys(dataRow).map(Number);
      if (colIndexes.length === 0) continue;
      const maxCol = Math.max(...colIndexes);
      const rowValues: unknown[] = [];
      const rowStyles: Record<number, CellStyle> = {};
      const rowFormulas: Record<number, string> = {};
      colIndexes.forEach((colIndex) => {
        rowValues[colIndex] = dataRow[colIndex]?.v ?? null;
        const style = resolveStyle(snapshot, dataRow[colIndex]?.s);
        if (style) rowStyles[colIndex] = style;
        const formula = dataRow[colIndex]?.f;
        if (formula) rowFormulas[colIndex] = formula.replace(/^=/, "");
      });
      grid[rowIndex] = rowValues;
      if (Object.keys(rowStyles).length > 0) styles[rowIndex] = rowStyles;
      if (Object.keys(rowFormulas).length > 0) formulas[rowIndex] = rowFormulas;
      colCount = Math.max(colCount, maxCol + 1);
    }

    const merges = (sheetData?.mergeData ?? []).map((range) => ({
      top: range.startRow,
      left: range.startColumn,
      bottom: range.endRow,
      right: range.endColumn,
    }));

    const columnWidths: Record<number, number> = {};
    Object.entries(sheetData?.columnData ?? {}).forEach(([colIndex, col]) => {
      if (col?.w) columnWidths[Number(colIndex)] = col.w;
    });

    const rowHeights: Record<number, number> = {};
    Object.entries(sheetData?.rowData ?? {}).forEach(([rowIndex, row]) => {
      if (row?.h) rowHeights[Number(rowIndex)] = row.h;
    });

    return {
      name: sheetData?.name ?? "Planilha",
      grid,
      styles,
      formulas,
      columnWidths,
      rowHeights,
      rowCount: grid.length,
      colCount,
      merges,
    } satisfies ParsedGridSheet;
  });
}
