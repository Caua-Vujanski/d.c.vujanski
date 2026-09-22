"use client";

import { useCallback, useMemo, useState } from "react";
import { DataGrid, type Column, type RowsChangeData } from "react-data-grid";
import "react-data-grid/lib/styles.css";
import { createClient } from "@/lib/supabase/client";
import type { SheetColumn } from "@/lib/spreadsheet";

interface SheetRowRecord {
  id: string;
  row_index: number;
  data: Record<string, unknown>;
}

interface GridRow {
  id: string;
  rowIndex: number;
  [key: string]: unknown;
}

function toGridRow(row: SheetRowRecord): GridRow {
  return { id: row.id, rowIndex: row.row_index, ...row.data };
}

export function SheetGrid({
  sheetId,
  columns,
  initialRows,
}: {
  sheetId: string;
  columns: SheetColumn[];
  initialRows: SheetRowRecord[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [rows, setRows] = useState<GridRow[]>(() => initialRows.map(toGridRow));
  const [savingCount, setSavingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const persistRow = useCallback(
    async (row: GridRow) => {
      setSavingCount((n) => n + 1);
      const data: Record<string, unknown> = {};
      columns.forEach((col) => {
        data[col.key] = row[col.key] ?? null;
      });

      const { error: updateError } = await supabase
        .from("sheet_rows")
        .update({ data })
        .eq("id", row.id)
        .eq("sheet_id", sheetId);

      setSavingCount((n) => n - 1);

      if (updateError) {
        setError(`Falha ao salvar linha: ${updateError.message}`);
      }
    },
    [columns, sheetId, supabase],
  );

  const handleRowsChange = useCallback(
    (newRows: GridRow[], { indexes }: RowsChangeData<GridRow>) => {
      setRows(newRows);
      indexes.forEach((index) => {
        const row = newRows[index];
        if (row) void persistRow(row);
      });
    },
    [persistRow],
  );

  const handleAddRow = useCallback(async () => {
    const nextIndex =
      rows.length > 0 ? Math.max(...rows.map((r) => r.rowIndex)) + 1 : 0;
    const emptyData: Record<string, unknown> = {};
    columns.forEach((col) => {
      emptyData[col.key] = "";
    });

    const { data: newRow, error: insertError } = await supabase
      .from("sheet_rows")
      .insert({ sheet_id: sheetId, row_index: nextIndex, data: emptyData })
      .select()
      .single();

    if (insertError || !newRow) {
      setError(`Falha ao adicionar linha: ${insertError?.message}`);
      return;
    }

    setRows((prev) => [...prev, toGridRow(newRow)]);
  }, [columns, rows, sheetId, supabase]);

  const handleDeleteRow = useCallback(
    async (rowId: string) => {
      const { error: deleteError } = await supabase
        .from("sheet_rows")
        .delete()
        .eq("id", rowId)
        .eq("sheet_id", sheetId);

      if (deleteError) {
        setError(`Falha ao remover linha: ${deleteError.message}`);
        return;
      }

      setRows((prev) => prev.filter((row) => row.id !== rowId));
    },
    [sheetId, supabase],
  );

  const gridColumns = useMemo<Column<GridRow>[]>(
    () => [
      {
        key: "__actions",
        name: "",
        width: 90,
        renderCell: ({ row }: { row: GridRow }) => (
          <button
            onClick={() => void handleDeleteRow(row.id)}
            className="text-xs text-red-600 hover:underline"
          >
            Remover
          </button>
        ),
      },
      ...columns.map<Column<GridRow>>((col) => ({
        key: col.key,
        name: col.label,
        editable: true,
        resizable: true,
        width: 180,
      })),
    ],
    [columns, handleDeleteRow],
  );

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <DataGrid
          columns={gridColumns}
          rows={rows}
          onRowsChange={handleRowsChange}
          rowKeyGetter={(row) => row.id}
          className="rdg-light"
          style={{ blockSize: "auto", minHeight: 400 }}
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => void handleAddRow()}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          + Adicionar linha
        </button>
        {savingCount > 0 && (
          <span className="text-xs text-gray-400">Salvando...</span>
        )}
      </div>
    </div>
  );
}
