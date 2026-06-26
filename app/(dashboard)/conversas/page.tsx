import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Paciente } from "@/lib/types";
import PausarBotToggle from "@/components/PausarBotToggle";

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

export default async function ConversasPage() {
  const supabase = await createClient();

  const [{ data: pacientes, error }, { data: pausados }] = await Promise.all([
    supabase
      .from("pacientes")
      .select("*")
      .order("ultima_interacao", { ascending: false }),
    supabase.from("bot_pausado").select("telefone"),
  ]);

  const globalPaused = (pausados ?? []).some(
    (p) => p.telefone === "__GLOBAL__"
  );
  const pausadosSet = new Set(
    (pausados ?? [])
      .map((p) => p.telefone)
      .filter((t) => t !== "__GLOBAL__")
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Conversas</h1>
        <p className="mt-1 text-sm text-slate-500">
          Pacientes que já conversaram com o bot pelo WhatsApp. Pause o bot
          para uma conversa específica quando precisar atender manualmente.
        </p>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Erro ao carregar conversas: {error.message}
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {pacientes && pacientes.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Telefone</th>
                <th className="px-4 py-3 font-medium">Última interação</th>
                <th className="px-4 py-3 font-medium">Status do bot</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(pacientes as Paciente[]).map((p) => {
                const pausado = pausadosSet.has(p.telefone);
                return (
                  <tr key={p.telefone}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <Link
                        href={`/conversas/${encodeURIComponent(p.telefone)}`}
                        className="hover:text-brand-700 hover:underline"
                      >
                        {p.nome || "Sem nome"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {p.telefone}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                      {formatDate(p.ultima_interacao)}
                    </td>
                    <td className="px-4 py-3">
                      {globalPaused ? (
                        <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          Pausado (todos)
                        </span>
                      ) : pausado ? (
                        <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                          Pausado
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                          Ativo
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <PausarBotToggle telefone={p.telefone} pausado={pausado} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="px-4 py-8 text-center text-sm text-slate-500">
            Nenhum paciente registrado ainda.
          </p>
        )}
      </div>
    </div>
  );
}
