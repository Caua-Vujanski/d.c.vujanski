"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function UploadForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      router.push(`/sheets/${body.sheet.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao importar planilha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-4 rounded-lg border border-dashed border-gray-300 bg-white p-4"
    >
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Nome (opcional)
        </label>
        <input
          name="name"
          type="text"
          placeholder="Ex: Clientes 2026"
          className="w-56 rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Arquivo
        </label>
        <input
          name="file"
          type="file"
          required
          accept=".xlsx,.xls,.csv"
          className="text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {loading ? "Importando..." : "Importar planilha"}
      </button>
      {error && <p className="w-full text-sm text-red-600">{error}</p>}
    </form>
  );
}
