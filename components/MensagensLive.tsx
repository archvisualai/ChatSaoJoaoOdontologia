"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Mensagem } from "@/lib/types";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MensagensLive({
  telefone,
  inicial,
}: {
  telefone: string;
  inicial: Mensagem[];
}) {
  const [mensagens, setMensagens] = useState<Mensagem[]>(inicial);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let authSub: { subscription: { unsubscribe: () => void } } | null = null;
    let cancelled = false;

    (async () => {
      // O Realtime precisa do token do usuário para passar pelo RLS
      // (acesso anônimo foi revogado na tabela mensagens).
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session) {
        await supabase.realtime.setAuth(session.access_token);
      }

      // mantém o token do Realtime válido em abas abertas por muito tempo
      authSub = supabase.auth.onAuthStateChange((_event, s) => {
        if (s) supabase.realtime.setAuth(s.access_token);
      }).data;

      channel = supabase
        .channel(`mensagens:${telefone}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "mensagens",
            filter: `telefone=eq.${telefone}`,
          },
          (payload) => {
            const nova = payload.new as Mensagem;
            setMensagens((prev) =>
              prev.some((m) => m.id === nova.id) ? prev : [...prev, nova]
            );
          }
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
      if (authSub) authSub.subscription.unsubscribe();
    };
  }, [telefone]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens.length]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {mensagens.length > 0 ? (
        <ul className="space-y-3">
          {mensagens.map((m) => {
            const isRecebida = m.direcao === "recebida";
            return (
              <li
                key={m.id}
                className={`flex ${
                  isRecebida ? "justify-start" : "justify-end"
                }`}
              >
                <div
                  className={`max-w-md rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap ${
                    isRecebida
                      ? "bg-slate-100 text-slate-900"
                      : "bg-brand-600 text-white"
                  }`}
                >
                  {m.tipo === "imagem" && m.midia_url?.startsWith("https://") && (
                    <a href={m.midia_url} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={m.midia_url}
                        alt={m.arquivo_nome ?? "imagem"}
                        className="mb-1 max-h-60 rounded-lg object-cover"
                      />
                    </a>
                  )}
                  {m.tipo === "documento" && m.midia_url?.startsWith("https://") && (
                    <a
                      href={m.midia_url}
                      target="_blank"
                      rel="noreferrer"
                      className={`mb-1 flex items-center gap-2 underline ${
                        isRecebida ? "text-slate-900" : "text-white"
                      }`}
                    >
                      <span>📎</span>
                      <span className="truncate">
                        {m.arquivo_nome ?? "documento"}
                      </span>
                    </a>
                  )}
                  {m.conteudo && <p>{m.conteudo}</p>}
                  <p
                    className={`mt-1 text-[11px] ${
                      isRecebida ? "text-slate-400" : "text-brand-100"
                    }`}
                  >
                    {formatDateTime(m.criado_em)}
                  </p>
                </div>
              </li>
            );
          })}
          <div ref={bottomRef} />
        </ul>
      ) : (
        <p className="py-8 text-center text-sm text-slate-500">
          Nenhuma mensagem registrada para este paciente.
        </p>
      )}
    </div>
  );
}
