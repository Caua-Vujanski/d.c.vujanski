"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
    } else {
      router.push("/sheets");
      router.refresh();
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 px-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1.5px 1.5px, white 1.5px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl shadow-black/20">
        <div className="flex flex-col items-center gap-3 bg-brand-900 px-8 py-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-sm font-bold tracking-wide text-brand-900">
            DCV
          </div>
          <div>
            <p className="text-base font-semibold text-white">
              D.C.Camargo Vujanski
            </p>
            <p className="text-xs text-brand-200">Sistema de Planilhas</p>
          </div>
        </div>
        <div className="p-8">
          <h1 className="mb-6 text-lg font-semibold text-brand-950">Entrar</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                E-mail
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 pr-16 text-sm focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  className="absolute inset-y-0 right-0 px-3 text-xs font-medium text-gray-500 hover:text-brand-700"
                >
                  {showPassword ? "Ocultar" : "Ver"}
                </button>
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-brand-700 px-3 py-2 text-sm font-medium text-white hover:bg-brand-800 disabled:opacity-50"
            >
              {loading ? "Aguarde..." : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
