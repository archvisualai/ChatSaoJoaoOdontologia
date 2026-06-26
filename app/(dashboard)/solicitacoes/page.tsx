import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  SOLICITACAO_TIPO_LABEL as TIPO_LABELS,
} from "@/lib/types";
import type { Solicitacao, SolicitacaoTipo } from "@/lib/types";
import MarcarAtendidoButton from "@/components/MarcarAtendidoButton";

const TIPOS = Object.keys(TIPO_LABELS) as SolicitacaoTipo[];

function formatDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function SolicitacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string; status?: string }>;
}) {
  const params = await searchParams;
  const tipo = params.tipo;
  const status = params.status ?? "pendente";

  const supabase = await createClient();

  let query = supabase
    .from("solicitacoes")
    .select("*")
    .order("criado_em", { ascending: false });

  if (status !== "todos") {
    query = query.eq("status", status);
  }
  if (tipo) {
    query = query.eq("tipo", tipo);
  }

  const { data: solicitacoes, error } = await query;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Solicitações
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Pedidos de agendamento, reagendamento, urgência e contato com a
          secretaria, gerados pelo bot do WhatsApp.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterGroup
          label="Status"
          currentTipo={tipo}
          currentStatus={status}
          options={[
            { value: "pendente", label: "Pendentes" },
            { value: "atendido", label: "Atendidas" },
            { value: "todos", label: "Todas" },
          ]}
          paramName="status"
        />
        <span className="mx-2 h-5 w-px bg-slate-200" />
        <FilterGroup
          label="Tipo"
          currentTipo={tipo}
          currentStatus={status}
          options={[
            { value: undefined, label: "Todos os tipos" },
            ...TIPOS.map((t) => ({ value: t, label: TIPO_LABELS[t] })),
          ]}
          paramName="tipo"
        />
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Erro ao carregar solicitações: {error.message}
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        {solicitacoes && solicitacoes.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Paciente</th>
                <th className="px-4 py-3 font-medium">Telefone</th>
                <th className="px-4 py-3 font-medium">Tipo</th>
                <th className="px-4 py-3 font-medium">Detalhes</th>
                <th className="px-4 py-3 font-medium">Criado em</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(solicitacoes as Solicitacao[]).map((s) => (
                <tr key={s.id} className="align-top">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    <Link
                      href={`/conversas/${encodeURIComponent(s.telefone)}`}
                      className="hover:text-brand-700 hover:underline"
                    >
                      {s.nome || "Sem nome"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{s.telefone}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                      {TIPO_LABELS[s.tipo] ?? s.tipo}
                    </span>
                  </td>
                  <td className="max-w-xs px-4 py-3 text-slate-600">
                    {s.detalhes || "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                    {formatDate(s.criado_em)}
                  </td>
                  <td className="px-4 py-3">
                    {s.status === "pendente" ? (
                      <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        Pendente
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                        Atendido
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {s.status === "pendente" && (
                      <MarcarAtendidoButton id={s.id} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-4 py-8 text-center text-sm text-slate-500">
            Nenhuma solicitação encontrada.
          </p>
        )}
      </div>
    </div>
  );
}

function FilterGroup({
  label,
  options,
  paramName,
  currentTipo,
  currentStatus,
}: {
  label: string;
  options: { value: string | undefined; label: string }[];
  paramName: "tipo" | "status";
  currentTipo?: string;
  currentStatus: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-slate-500">{label}:</span>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => {
          const params = new URLSearchParams();
          const tipo = paramName === "tipo" ? opt.value : currentTipo;
          const status = paramName === "status" ? opt.value : currentStatus;

          if (tipo) params.set("tipo", tipo);
          if (status && status !== "pendente") params.set("status", status);

          const isActive =
            paramName === "tipo"
              ? currentTipo === opt.value
              : currentStatus === (opt.value ?? "pendente");

          const href = params.toString()
            ? `/solicitacoes?${params.toString()}`
            : "/solicitacoes";

          return (
            <Link
              key={opt.label}
              href={href}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                isActive
                  ? "bg-brand-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {opt.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
