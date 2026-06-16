import type { ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { SolicitacaoTipo } from "@/lib/types";
import { IconClipboard, IconUsers, IconChat, IconPause } from "@/components/icons";

const TIPO_META: Record<SolicitacaoTipo, { label: string; dot: string }> = {
  agendamento: { label: "Agendamentos", dot: "bg-brand-500" },
  reagendamento: { label: "Reagendamentos", dot: "bg-sky-500" },
  cancelamento: { label: "Cancelamentos", dot: "bg-rose-500" },
  urgencia: { label: "Urgências", dot: "bg-red-500" },
  secretaria: { label: "Secretaria", dot: "bg-violet-500" },
};

export default async function OverviewPage() {
  const supabase = await createClient();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [
    { data: pendentes, error: errPendentes },
    { count: totalPacientes, error: errPacientes },
    { count: mensagensHoje, error: errMensagens },
    { count: conversasPausadas, error: errPausadas },
  ] = await Promise.all([
    supabase.from("solicitacoes").select("tipo").eq("status", "pendente"),
    supabase.from("pacientes").select("*", { count: "exact", head: true }),
    supabase
      .from("mensagens")
      .select("*", { count: "exact", head: true })
      .eq("direcao", "recebida")
      .gte("criado_em", startOfToday.toISOString()),
    supabase.from("bot_pausado").select("*", { count: "exact", head: true }),
  ]);

  const erro =
    errPendentes ?? errPacientes ?? errMensagens ?? errPausadas ?? null;

  const contagemPorTipo: Record<string, number> = {};
  for (const item of pendentes ?? []) {
    contagemPorTipo[item.tipo] = (contagemPorTipo[item.tipo] ?? 0) + 1;
  }

  const totalPendentes = pendentes?.length ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Visão geral</h1>
        <p className="mt-1 text-sm text-slate-500">
          Resumo do atendimento via WhatsApp.
        </p>
      </div>

      {erro && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Erro ao carregar os dados: {erro.message}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Solicitações pendentes"
          value={totalPendentes}
          icon={<IconClipboard className="h-5 w-5" />}
          href="/solicitacoes"
          highlight
        />
        <StatCard
          label="Pacientes cadastrados"
          value={totalPacientes ?? 0}
          icon={<IconUsers className="h-5 w-5" />}
          href="/conversas"
        />
        <StatCard
          label="Mensagens recebidas hoje"
          value={mensagensHoje ?? 0}
          icon={<IconChat className="h-5 w-5" />}
          href="/conversas"
        />
        <StatCard
          label="Conversas pausadas"
          value={conversasPausadas ?? 0}
          icon={<IconPause className="h-5 w-5" />}
          href="/conversas"
        />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-slate-900">
          Pendentes por tipo
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {(Object.keys(TIPO_META) as SolicitacaoTipo[]).map((tipo) => (
            <Link
              key={tipo}
              href={`/solicitacoes?tipo=${tipo}`}
              className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
            >
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${TIPO_META[tipo].dot}`} />
                <p className="text-xs text-slate-500">{TIPO_META[tipo].label}</p>
              </div>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {contagemPorTipo[tipo] ?? 0}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  href,
  highlight,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  href?: string;
  highlight?: boolean;
}) {
  const className = `block rounded-2xl border p-5 shadow-sm transition ${
    highlight ? "border-brand-200 bg-brand-50" : "border-slate-200 bg-white"
  } ${href ? "hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md" : ""}`;

  const inner = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{label}</p>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            highlight
              ? "bg-brand-100 text-brand-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {icon}
        </span>
      </div>
      <p
        className={`mt-3 text-3xl font-semibold ${
          highlight ? "text-brand-700" : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }
  return <div className={className}>{inner}</div>;
}
