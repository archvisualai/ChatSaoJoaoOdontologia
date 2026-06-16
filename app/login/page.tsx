"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registrarSecretaria } from "@/lib/actions";

type Mode = "login" | "signup";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setPassword("");
    setCodigo("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    if (mode === "signup") {
      const result = await registrarSecretaria(email, password, codigo);
      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }
      // conta criada (já confirmada) — faz login automático
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(
        mode === "signup"
          ? "Conta criada, mas não foi possível entrar. Tente fazer login."
          : "E-mail ou senha incorretos. Tente novamente."
      );
      setLoading(false);
      if (mode === "signup") setMode("login");
      return;
    }

    router.push("/");
    router.refresh();
  }

  const isSignup = mode === "signup";

  return (
    <div className="flex flex-1 items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <div className="mb-6 text-center">
          <Image
            src="/logo.png"
            alt="São João Odontologia"
            width={64}
            height={64}
            priority
            className="mx-auto mb-3 rounded-2xl"
          />
          <h1 className="text-xl font-semibold text-slate-900">
            São João Odontologia
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {isSignup
              ? "Cadastro de secretária"
              : "Painel da secretária — entre com sua conta"}
          </p>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              !isSignup
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              isSignup
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Cadastrar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="voce@saojoaoodontologia.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              Senha
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={isSignup ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              placeholder="••••••••"
            />
            {isSignup && (
              <p className="mt-1 text-xs text-slate-400">
                Mínimo de 8 caracteres.
              </p>
            )}
          </div>

          {isSignup && (
            <div>
              <label
                htmlFor="codigo"
                className="mb-1 block text-sm font-medium text-slate-700"
              >
                Código de cadastro
              </label>
              <input
                id="codigo"
                type="password"
                required
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="Código fornecido pela clínica"
              />
            </div>
          )}

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? isSignup
                ? "Cadastrando..."
                : "Entrando..."
              : isSignup
                ? "Cadastrar e entrar"
                : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
