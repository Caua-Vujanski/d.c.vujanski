"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

interface SheetSummary {
  id: string;
  name: string;
  original_filename: string | null;
  row_count: number;
  created_at: string;
}

export function SheetsTable({ sheets }: { sheets: SheetSummary[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sheets;
    return sheets.filter((sheet) => sheet.name.toLowerCase().includes(q));
  }, [sheets, query]);

  if (sheets.length === 0) {
    return (
      <div className="overflow-hidden rounded-xl border border-brand-100 bg-white shadow-sm">
        <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" className="h-7 w-7">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5h10.5a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 6.75v10.5a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-brand-950">
            Nenhuma planilha importada ainda
          </p>
          <p className="max-w-xs text-sm text-gray-500">
            Use o formulário acima para importar seu primeiro arquivo .xlsx, .xls ou .csv.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-brand-100 bg-white shadow-sm">
      <div className="border-b border-brand-100 p-4">
        <div className="relative max-w-xs">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            strokeWidth={1.75}
            stroke="currentColor"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.34-4.34M18.5 10.5a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar por nome..."
            className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="p-6 text-sm text-gray-500">
          Nenhuma planilha encontrada para &ldquo;{query}&rdquo;.
        </p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="border-b border-brand-100 bg-brand-50 text-brand-800">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Arquivo original</th>
              <th className="px-4 py-3 font-medium">Linhas</th>
              <th className="px-4 py-3 font-medium">Importada em</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((sheet) => (
              <tr
                key={sheet.id}
                className="group border-b border-brand-50 last:border-0 hover:bg-brand-50/60"
              >
                <td className="px-4 py-3">
                  <Link
                    href={`/sheets/${sheet.id}`}
                    className="flex items-center gap-3 font-medium text-brand-900"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-100 text-xs font-semibold text-brand-800">
                      {sheet.name.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="group-hover:underline">{sheet.name}</span>
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {sheet.original_filename}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {sheet.row_count.toLocaleString("pt-BR")}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(sheet.created_at).toLocaleString("pt-BR")}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/sheets/${sheet.id}`}
                    className="text-brand-600 opacity-0 transition-opacity group-hover:opacity-100"
                    aria-label={`Abrir ${sheet.name}`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="ml-auto h-4 w-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
