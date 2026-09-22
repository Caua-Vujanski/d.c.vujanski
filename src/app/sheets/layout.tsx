import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";

export default function SheetsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col bg-background">
      <header className="shrink-0 bg-brand-900 shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/sheets" className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-900">
              DCV
            </span>
            <span className="font-semibold text-white">
              D.C.Camargo Vujanski
            </span>
          </Link>
          <LogoutButton />
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
    </div>
  );
}
