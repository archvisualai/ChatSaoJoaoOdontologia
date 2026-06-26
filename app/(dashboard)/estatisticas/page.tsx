import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SOLICITACAO_TIPO_LABEL } from "@/lib/types";
import type { SolicitacaoTipo } from "@/lib/types";

const RANGES = [
  { key: "7", label: "7 dias", days: 7 },
  { key: "30", label: "30 dias", days: 30 },
  { key: "90", label: "90 dias", days: 90 },
  { key: "all", label: "Tudo", days: null as number | null },
];

type Row = {
  tipo: string;
  status: string;
  detalhes: string | null;
  criado_em: string;
  atendido_em: string | null;
};

function parseAgendamento(detalhes: string | null) {
  if (!detalhes) return null;
  const m = detalhes.match(
    /Procedimento:\s*(.*?)\s*\|\s*Dia:\s*(.*?)\s*\|\s*Per[ií]odo:\s*(.*)$/i
  );
  if (!m) return null;
  return {
    procedimento: m[1].trim(),
    dia: m[2].trim(),
    periodo: m[3].trim(),
  };
}

function fmtTempo(h: number | null) {
  if (h === null) return "—";
  if (h < 1) return `${Math.round(h * 60)}min`;
  if (h < 24) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

export default async function EstatisticasPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.app_metadata?.role !== "medica") redirect("/");

  const params = await searchParams;
  const rangeKey =
    typeof params.range === "string" && RANGES.some((r) => r.key === params.range)
      ? params.range
      : "30";
  const range = RANGES.find((r) => r.key === rangeKey)!;

  let query = supabase
    .from("solicitacoes")
    .select("tipo,status,detalhes,criado_em,atendido_em")
    .order("criado_em", { ascending: true });

  if (range.days !== null) {
    const start = new Date();
    start.setDate(start.getDate() - range.days);
    start.setHours(0, 0, 0, 0);
    query = query.gte("criado_em", start.toISOString());
  }

  const { data, error } = await query;
  const sol = (data ?? []) as Row[];

  const total = sol.length;
  const pendentes = sol.filter((s) => s.status === "pendente").length;
  const atendidas = sol.filter((s) => s.status === "atendido").length;
  const pctAtend = total ? Math.round((atendidas / total) * 100) : 0;

  const tempos = sol
    .filter((s) => s.status === "atendido" && s.atendido_em)
    .map(
      (s) =>
        (new Date(s.atendido_em as string).getTime() -
          new Date(s.criado_em).getTime()) /
        3600000
    )
    .filter((h) => h >= 0);
  const tempoMedio = tempos.length
    ? tempos.reduce((a, b) => a + b, 0) / tempos.length
    : null;

  // por tipo
  const porTipo: Record<string, number> = {};
  for (const t of Object.keys(SOLICITACAO_TIPO_LABEL)) porTipo[t] = 0;
  for (const s of sol) porTipo[s.tipo] = (porTipo[s.tipo] ?? 0) + 1;
  const tipoRank = (Object.keys(SOLICITACAO_TIPO_LABEL) as SolicitacaoTipo[]).map(
    (t) => ({ label: SOLICITACAO_TIPO_LABEL[t], value: porTipo[t] })
  );

  // por dia
  const porDiaMap = new Map<string, number>();
  for (const s of sol) {
    const key = new Date(s.criado_em).toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      day: "2-digit",
      month: "2-digit",
    });
    porDiaMap.set(key, (porDiaMap.get(key) ?? 0) + 1);
  }
  const porDia = [...porDiaMap.entries()];
  const maxDia = porDia.reduce((m, [, v]) => Math.max(m, v), 0);

  // procedimentos / dias / períodos (agendamentos)
  const procCount: Record<string, number> = {};
  const diaCount: Record<string, number> = {};
  const periodoCount: Record<string, number> = {};
  for (const s of sol) {
    if (s.tipo !== "agendamento") continue;
    const p = parseAgendamento(s.detalhes);
    if (!p) continue;
    if (p.procedimento)
      procCount[p.procedimento] = (procCount[p.procedimento] ?? 0) + 1;
    if (p.dia) diaCount[p.dia] = (diaCount[p.dia] ?? 0) + 1;
    if (p.periodo) periodoCount[p.periodo] = (periodoCount[p.periodo] ?? 0) + 1;
  }
  const procRank = Object.entries(procCount)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
  const diasOrder = [
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
  ];
  const diaRank = diasOrder.map((d) => ({ label: d, value: diaCount[d] ?? 0 }));
  const periodoRank = [
    { label: "Manhã", value: periodoCount["Manhã"] ?? 0 },
    { label: "Tarde", value: periodoCount["Tarde"] ?? 0 },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Estatísticas</h1>
          <p className="mt-1 text-sm text-slate-500">
            Indicadores dos atendimentos via WhatsApp.
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {RANGES.map((r) => {
            const active = r.key === rangeKey;
            return (
              <Link
                key={r.key}
                href={`/estatisticas?range=${r.key}`}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  active
                    ? "bg-brand-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {r.label}
              </Link>
            );
          })}
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Erro ao carregar dados: {error.message}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Solicitações" value={total} highlight />
        <StatCard label="Pendentes" value={pendentes} />
        <StatCard label="Atendidas" value={atendidas} />
        <StatCard label="% atendidas" value={`${pctAtend}%`} />
        <StatCard label="Tempo médio" value={fmtTempo(tempoMedio)} />
      </div>

      {total === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500 shadow-sm">
          Sem dados no período selecionado.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Section title="Solicitações por tipo">
              <BarList rows={tipoRank} />
            </Section>
            <Section title="Solicitações por dia">
              {porDia.length > 0 ? (
                <div className="flex h-28 items-end gap-1">
                  {porDia.map(([d, v]) => (
                    <div
                      key={d}
                      title={`${d}: ${v}`}
                      className="flex-1 rounded-t bg-brand-400"
                      style={{
                        height: `${maxDia ? Math.max((v / maxDia) * 100, 4) : 0}%`,
                      }}
                    />
                  ))}
                </div>
              ) : (
                <Empty />
              )}
              <p className="mt-2 text-xs text-slate-400">
                {porDia.length} dia(s) com atividade — passe o mouse para ver a data.
              </p>
            </Section>
          </div>

          <Section title="Procedimentos mais procurados">
            {procRank.length > 0 ? <BarList rows={procRank} /> : <Empty />}
          </Section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Section title="Dias preferidos (agendamentos)">
              <BarList rows={diaRank} />
            </Section>
            <Section title="Período preferido (agendamentos)">
              <BarList rows={periodoRank} />
            </Section>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm ${
        highlight ? "border-brand-200 bg-brand-50" : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold ${
          highlight ? "text-brand-700" : "text-slate-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold text-slate-900">{title}</h2>
      {children}
    </div>
  );
}

function BarList({ rows }: { rows: { label: string; value: number }[] }) {
  const max = rows.reduce((m, r) => Math.max(m, r.value), 0);
  return (
    <div className="space-y-2.5">
      {rows.map((r) => {
        const pct = max > 0 ? (r.value / max) * 100 : 0;
        return (
          <div key={r.label} className="flex items-center gap-3 text-sm">
            <span className="w-36 shrink-0 truncate text-slate-600" title={r.label}>
              {r.label}
            </span>
            <div className="h-2.5 flex-1 rounded-full bg-slate-100">
              <div
                className="h-2.5 rounded-full bg-brand-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-8 shrink-0 text-right font-medium text-slate-900">
              {r.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Empty() {
  return <p className="py-4 text-sm text-slate-400">Sem dados no período.</p>;
}
