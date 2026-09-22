import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { UploadForm } from "./upload-form";

export const dynamic = "force-dynamic";

export default async function SheetsPage() {
  const supabase = await createClient();
  const { data: sheets } = await supabase
    .from("sheets")
    .select("id, name, original_filename, row_count, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Suas planilhas</h1>
        <p className="mt-1 text-sm text-gray-500">
          Importe uma planilha (.xlsx, .xls ou .csv) para editar os dados diretamente pelo sistema.
        </p>
      </div>

      <UploadForm />

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {!sheets || sheets.length === 0 ? (
          <p className="p-6 text-sm text-gray-500">
            Nenhuma planilha importada ainda.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Arquivo original</th>
                <th className="px-4 py-3 font-medium">Linhas</th>
                <th className="px-4 py-3 font-medium">Importada em</th>
              </tr>
            </thead>
            <tbody>
              {sheets.map((sheet) => (
                <tr
                  key={sheet.id}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/sheets/${sheet.id}`}
                      className="font-medium text-gray-900 hover:underline"
                    >
                      {sheet.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {sheet.original_filename}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{sheet.row_count}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(sheet.created_at).toLocaleString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
