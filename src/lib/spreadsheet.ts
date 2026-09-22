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

export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  fontSize?: number;
  fontFamily?: string;
  fontColor?: string; // "#RRGGBB"
  backgroundColor?: string; // "#RRGGBB"
  horizontalAlign?: "left" | "center" | "right" | "justify";
  verticalAlign?: "top" | "middle" | "bottom";
  numberFormat?: string;
}

export interface ParsedGridSheet {
  name: string;
  // grid[rowIndex][colIndex], ambos 0-based; pode ter buracos em linhas/colunas vazias.
  grid: unknown[][];
  // styles[rowIndex][colIndex], só presente quando a célula tem formatação não-padrão.
  styles: Record<number, Record<number, CellStyle>>;
  // formulas[rowIndex][colIndex], texto da fórmula sem o "=" inicial.
  formulas: Record<number, Record<number, string>>;
  // largura de colunas e altura de linhas, em pixels, apenas onde definidas explicitamente.
  columnWidths: Record<number, number>;
  rowHeights: Record<number, number>;
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
  const styles: Record<number, Record<number, CellStyle>> = {};
  const formulas: Record<number, Record<number, string>> = {};
  const rowHeights: Record<number, number> = {};
  let colCount = 0;

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const rowIndex = rowNumber - 1;
    if (rowIndex >= MAX_ROWS) return;

    if (row.height) rowHeights[rowIndex] = pointsToPixels(row.height);

    const rowValues: unknown[] = [];
    const rowStyles: Record<number, CellStyle> = {};
    const rowFormulas: Record<number, string> = {};
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const colIndex = colNumber - 1;
      if (colIndex >= MAX_COLUMNS) return;
      rowValues[colIndex] = cellToValue(cell);
      const style = extractCellStyle(cell);
      if (style) rowStyles[colIndex] = style;
      // Células de fórmula sem resultado em cache (ex: arquivo salvo por outro
      // programa sem recalcular) não têm valor pronto para exibir — repassamos
      // a fórmula para o Univer, que tem motor de cálculo próprio, em vez de
      // tentar adivinhar o valor.
      if (cell.formula) rowFormulas[colIndex] = cell.formula;
    });
    grid[rowIndex] = rowValues;
    if (Object.keys(rowStyles).length > 0) styles[rowIndex] = rowStyles;
    if (Object.keys(rowFormulas).length > 0) formulas[rowIndex] = rowFormulas;
    colCount = Math.max(colCount, rowValues.length);
  });

  colCount = Math.max(colCount, Math.min(worksheet.columnCount, MAX_COLUMNS));

  const columnWidths: Record<number, number> = {};
  for (let i = 1; i <= colCount; i++) {
    const width = worksheet.getColumn(i).width;
    if (width) columnWidths[i - 1] = charWidthToPixels(width);
  }

  const merges: SheetMerge[] = [];
  for (const range of worksheet.model.merges ?? []) {
    const parsed = parseRange(range);
    if (parsed) merges.push(parsed);
  }

  return {
    name: worksheet.name || "Planilha",
    grid,
    styles,
    formulas,
    columnWidths,
    rowHeights,
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
  if (cell.formula) {
    // O valor "pronto" de uma fórmula é o resultado em cache no arquivo (pode
    // não existir se o arquivo foi salvo sem recalcular) — a fórmula em si é
    // repassada separadamente para o Univer recalcular.
    const result = cell.result;
    if (result === null || result === undefined) return null;
    if (result instanceof Date) return result.toISOString();
    if (typeof result === "string" || typeof result === "number" || typeof result === "boolean") {
      return result;
    }
    return null;
  }

  const value = cell.value;
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    if ("text" in value) return String((value as { text: unknown }).text);
    return null;
  }
  return value;
}

const HORIZONTAL_ALIGNS = ["left", "center", "right", "justify"] as const;
const VERTICAL_ALIGNS = ["top", "middle", "bottom"] as const;

function extractCellStyle(cell: ExcelJS.Cell): CellStyle | null {
  const style: CellStyle = {};

  const font = cell.font;
  if (font) {
    if (font.bold) style.bold = true;
    if (font.italic) style.italic = true;
    if (font.underline) style.underline = true;
    if (font.strike) style.strike = true;
    if (font.size) style.fontSize = font.size;
    if (font.name) style.fontFamily = font.name;
    const color = argbToHex((font.color as { argb?: string } | undefined)?.argb);
    if (color) style.fontColor = color;
  }

  const fill = cell.fill;
  if (fill && fill.type === "pattern" && fill.pattern === "solid") {
    const color = argbToHex((fill.fgColor as { argb?: string } | undefined)?.argb);
    if (color) style.backgroundColor = color;
  }

  const alignment = cell.alignment;
  const horizontal = alignment?.horizontal;
  if (horizontal && (HORIZONTAL_ALIGNS as readonly string[]).includes(horizontal)) {
    style.horizontalAlign = horizontal as CellStyle["horizontalAlign"];
  }
  const vertical = alignment?.vertical;
  if (vertical && (VERTICAL_ALIGNS as readonly string[]).includes(vertical)) {
    style.verticalAlign = vertical as CellStyle["verticalAlign"];
  }

  if (cell.numFmt && cell.numFmt !== "General") {
    style.numberFormat = cell.numFmt;
  }

  return Object.keys(style).length > 0 ? style : null;
}

function argbToHex(argb?: string): string | undefined {
  if (!argb || argb.length < 6) return undefined;
  const hex = argb.length === 8 ? argb.slice(2) : argb;
  return `#${hex.toUpperCase()}`;
}

function hexToArgb(hex: string): string {
  return `FF${hex.replace("#", "").toUpperCase()}`;
}

// Aproximações padrão de conversão entre unidades do Excel (caracteres/pontos) e pixels.
function pointsToPixels(points: number): number {
  return Math.round(points * (96 / 72));
}

function pixelsToPoints(pixels: number): number {
  return Math.round(pixels * (72 / 96) * 100) / 100;
}

function charWidthToPixels(width: number): number {
  return Math.round(width * 7 + 5);
}

function pixelsToCharWidth(pixels: number): number {
  return Math.round(((pixels - 5) / 7) * 100) / 100;
}

export async function buildWorkbookBuffer(sheets: ParsedGridSheet[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  sheets.forEach((sheet) => {
    const worksheet = workbook.addWorksheet(sheet.name || "Planilha");

    sheet.grid.forEach((rowValues, rowIndex) => {
      if (!rowValues) return;
      const row = worksheet.getRow(rowIndex + 1);
      rowValues.forEach((value, colIndex) => {
        const cell = row.getCell(colIndex + 1);
        const formula = sheet.formulas[rowIndex]?.[colIndex];
        if (formula) {
          cell.value = { formula, result: value as ExcelJS.CellFormulaValue["result"] };
        } else {
          cell.value = value as ExcelJS.CellValue;
        }
        applyCellStyle(cell, sheet.styles[rowIndex]?.[colIndex]);
      });
      const height = sheet.rowHeights[rowIndex];
      if (height) row.height = pixelsToPoints(height);
      row.commit();
    });

    Object.entries(sheet.columnWidths).forEach(([colIndex, width]) => {
      worksheet.getColumn(Number(colIndex) + 1).width = pixelsToCharWidth(width);
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

function applyCellStyle(cell: ExcelJS.Cell, style: CellStyle | undefined) {
  if (!style) return;

  if (
    style.bold ||
    style.italic ||
    style.underline ||
    style.strike ||
    style.fontSize ||
    style.fontFamily ||
    style.fontColor
  ) {
    cell.font = {
      bold: style.bold,
      italic: style.italic,
      underline: style.underline,
      strike: style.strike,
      size: style.fontSize,
      name: style.fontFamily,
      color: style.fontColor ? { argb: hexToArgb(style.fontColor) } : undefined,
    };
  }

  if (style.backgroundColor) {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: hexToArgb(style.backgroundColor) },
    };
  }

  if (style.horizontalAlign || style.verticalAlign) {
    cell.alignment = {
      horizontal: style.horizontalAlign,
      vertical: style.verticalAlign,
    };
  }

  if (style.numberFormat) {
    cell.numFmt = style.numberFormat;
  }
}
