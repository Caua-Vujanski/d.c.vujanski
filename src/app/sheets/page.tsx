import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { UploadForm } from "./upload-form";
import { SheetsTable } from "./sheets-table";

export const dynamic = "force-dynamic";

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-brand-100 bg-white p-5 shadow-sm">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          {label}
        </p>
        <p className="text-xl font-semibold text-brand-950">{value}</p>
      </div>
    </div>
  );
}

export default async function SheetsPage() {
  const supabase = await createClient();
  const { data: sheets } = await supabase
    .from("sheets")
    .select("id, name, original_filename, row_count, created_at, updated_at")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const { count: trashCount } = await supabase
    .from("sheets")
    .select("id", { count: "exact", head: true })
    .not("deleted_at", "is", null);

  const totalSheets = sheets?.length ?? 0;
  const totalRows =
    sheets?.reduce((sum, sheet) => sum + (sheet.row_count ?? 0), 0) ?? 0;
  const lastImport = sheets?.[0]?.created_at
    ? new Date(sheets[0].created_at).toLocaleDateString("pt-BR")
    : "—";

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
      <div className="relative mx-auto w-full max-w-7xl px-6 pt-10 pb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">Suas planilhas</h1>
            <p className="mt-1 text-sm text-brand-100">
              Importe uma planilha (.xlsx, .xls ou .csv) para editar os dados diretamente pelo sistema.
            </p>
          </div>
          <Link
            href="/sheets/lixeira"
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/20"
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
            Lixeira
            {!!trashCount && (
              <span className="ml-0.5 rounded-full bg-white/20 px-1.5 text-xs">
                {trashCount}
              </span>
            )}
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Planilhas"
            value={String(totalSheets)}
            icon={
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 3.75H6.75A2.25 2.25 0 0 0 4.5 6v12a2.25 2.25 0 0 0 2.25 2.25h10.5A2.25 2.25 0 0 0 19.5 18V9L13.5 3.75H9Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 3.75V9h5.25" />
              </svg>
            }
          />
          <StatCard
            label="Linhas de dados"
            value={totalRows.toLocaleString("pt-BR")}
            icon={
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
              </svg>
            }
          />
          <StatCard
            label="Última importação"
            value={lastImport}
            icon={
              <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75v5.25l3.5 2.083M20.25 12a8.25 8.25 0 1 1-16.5 0 8.25 8.25 0 0 1 16.5 0Z" />
              </svg>
            }
          />
        </div>

        <div className="mt-6 space-y-6">
          <UploadForm />
          <SheetsTable sheets={sheets ?? []} />
        </div>
      </div>
    </div>
  );
}
