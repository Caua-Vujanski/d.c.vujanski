"use client";

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function UploadForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFileName(event.target.files?.[0]?.name ?? null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/sheets/import", {
        method: "POST",
        body: formData,
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error ?? "Falha ao importar planilha.");
      }

      formRef.current?.reset();
      setFileName(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao importar planilha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-brand-100 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-700 text-white">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V4.5m0 0L7.5 9m4.5-4.5L16.5 9M4.5 16.5v2.25A2.25 2.25 0 0 0 6.75 21h10.5a2.25 2.25 0 0 0 2.25-2.25V16.5" />
          </svg>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-brand-950">Nova planilha</h2>
          <p className="text-xs text-gray-500">Formatos aceitos: .xlsx, .xls e .csv</p>
        </div>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-wrap items-end gap-4">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Nome (opcional)
          </label>
          <input
            name="name"
            type="text"
            placeholder="Ex: Clientes 2026"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
          />
        </div>
        <div className="min-w-[220px] flex-1">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Arquivo
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-brand-300 bg-brand-50/60 px-3 py-2 text-sm text-brand-800 hover:bg-brand-50">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-4 w-4 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01l-.01.01" />
            </svg>
            <span className="truncate">{fileName ?? "Escolher arquivo..."}</span>
            <input
              name="file"
              type="file"
              required
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-brand-700 px-5 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
        >
          {loading ? "Importando..." : "Importar planilha"}
        </button>
        {error && <p className="w-full text-sm text-red-600">{error}</p>}
      </form>
    </div>
  );
}
