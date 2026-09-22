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
    .select("id, name, original_filename, row_count, created_at")
    .order("created_at", { ascending: false });

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
        <h1 className="text-2xl font-semibold text-white">Suas planilhas</h1>
        <p className="mt-1 text-sm text-brand-100">
          Importe uma planilha (.xlsx, .xls ou .csv) para editar os dados diretamente pelo sistema.
        </p>

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
