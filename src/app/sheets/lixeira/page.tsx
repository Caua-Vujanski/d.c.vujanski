import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TrashTable } from "./trash-table";

export const dynamic = "force-dynamic";

export default async function TrashPage() {
  const supabase = await createClient();
  const { data: sheets } = await supabase
    .from("sheets")
    .select("id, name, original_filename, row_count, deleted_at")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 space-y-6 overflow-y-auto px-6 py-8">
      <div>
        <Link
          href="/sheets"
          className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-900"
        >
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Voltar
        </Link>
        <h1 className="text-2xl font-semibold text-brand-950">Lixeira</h1>
        <p className="mt-1 text-sm text-gray-500">
          Planilhas movidas para a lixeira. Restaure ou exclua definitivamente.
        </p>
      </div>

      <TrashTable sheets={sheets ?? []} />
    </div>
  );
}
