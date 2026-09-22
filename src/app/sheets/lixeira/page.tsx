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
    <div className="relative flex-1 overflow-y-auto bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1.5px 1.5px, white 1.5px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="relative mx-auto w-full max-w-7xl space-y-6 px-6 py-8">
        <div>
          <Link
            href="/sheets"
            className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand-100 hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Voltar
          </Link>
          <h1 className="text-2xl font-semibold text-white">Lixeira</h1>
          <p className="mt-1 text-sm text-brand-100">
            Planilhas movidas para a lixeira. Restaure ou exclua definitivamente.
          </p>
        </div>

        <TrashTable sheets={sheets ?? []} />
      </div>
    </div>
  );
}
