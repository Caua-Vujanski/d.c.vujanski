"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface TrashedSheet {
  id: string;
  name: string;
  original_filename: string | null;
  row_count: number;
  deleted_at: string;
}

export function TrashTable({ sheets }: { sheets: TrashedSheet[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<TrashedSheet | null>(null);

  async function handleRestore(sheet: TrashedSheet) {
    setBusyId(sheet.id);
    try {
      await fetch(`/api/sheets/${sheet.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore" }),
      });
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeleteForever(sheet: TrashedSheet) {
    setBusyId(sheet.id);
    try {
      await fetch(`/api/sheets/${sheet.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setBusyId(null);
      setConfirmTarget(null);
    }
  }

  if (sheets.length === 0) {
    return (
      <div className="overflow-hidden rounded-xl border border-brand-100 bg-white shadow-sm">
        <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" className="h-7 w-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          </div>
          <p className="text-sm font-medium text-brand-950">A lixeira está vazia</p>
          <p className="max-w-xs text-sm text-gray-500">
            Planilhas movidas para a lixeira aparecem aqui.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-brand-100 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-brand-100 bg-brand-50 text-brand-800">
          <tr>
            <th className="px-4 py-3 font-medium">Nome</th>
            <th className="px-4 py-3 font-medium">Arquivo original</th>
            <th className="px-4 py-3 font-medium">Linhas</th>
            <th className="px-4 py-3 font-medium">Excluída em</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {sheets.map((sheet) => (
            <tr
              key={sheet.id}
              className="border-b border-brand-50 last:border-0 hover:bg-brand-50/60"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-3 font-medium text-gray-700">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gray-100 text-xs font-semibold text-gray-500">
                    {sheet.name.slice(0, 2).toUpperCase()}
                  </span>
                  {sheet.name}
                </div>
              </td>
              <td className="px-4 py-3 text-gray-500">{sheet.original_filename}</td>
              <td className="px-4 py-3 text-gray-500">
                {sheet.row_count.toLocaleString("pt-BR")}
              </td>
              <td className="px-4 py-3 text-gray-500">
                {new Date(sheet.deleted_at).toLocaleString("pt-BR")}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => void handleRestore(sheet)}
                    disabled={busyId === sheet.id}
                    className="text-sm font-medium text-brand-700 hover:text-brand-900 disabled:opacity-50"
                  >
                    Restaurar
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmTarget(sheet)}
                    disabled={busyId === sheet.id}
                    className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                  >
                    Excluir definitivamente
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ConfirmDialog
        open={confirmTarget !== null}
        title="Excluir definitivamente"
        message={
          confirmTarget
            ? `Tem certeza que deseja excluir "${confirmTarget.name}" para sempre? Essa ação não pode ser desfeita.`
            : ""
        }
        confirmLabel="Excluir definitivamente"
        destructive
        loading={busyId === confirmTarget?.id}
        onConfirm={() => confirmTarget && void handleDeleteForever(confirmTarget)}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
}
