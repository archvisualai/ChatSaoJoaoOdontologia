import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Mensagem } from "@/lib/types";
import { formatTelefone } from "@/lib/types";
import Composer from "@/components/Composer";
import MensagensLive from "@/components/MensagensLive";

export default async function ConversaPage({
  params,
}: {
  params: Promise<{ telefone: string }>;
}) {
  const { telefone: telefoneParam } = await params;
  const telefone = decodeURIComponent(telefoneParam);

  const supabase = await createClient();

  const [{ data: paciente }, { data: mensagens, error }, { data: pausado }] =
    await Promise.all([
      supabase
        .from("pacientes")
        .select("*")
        .eq("telefone", telefone)
        .maybeSingle(),
      supabase
        .from("mensagens")
        .select("*")
        .eq("telefone", telefone)
        .order("criado_em", { ascending: true }),
      supabase
        .from("bot_pausado")
        .select("telefone")
        .eq("telefone", telefone)
        .maybeSingle(),
    ]);

  if (!paciente && (!mensagens || mensagens.length === 0)) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/conversas"
            className="text-sm text-brand-700 hover:underline"
          >
            ← Voltar para conversas
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            {paciente?.nome || "Sem nome"}
          </h1>
          <p className="text-sm text-slate-500">{formatTelefone(telefone)}</p>
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Erro ao carregar mensagens: {error.message}
        </p>
      )}

      <MensagensLive telefone={telefone} inicial={(mensagens as Mensagem[]) ?? []} />

      <div className="space-y-2">
        <Composer telefone={telefone} pausado={pausado !== null} />
        <p className="text-xs text-slate-500">
          Ao enviar, o bot é pausado para este paciente. Use &quot;Retomar
          bot&quot; para reativar.
        </p>
      </div>
    </div>
  );
}
