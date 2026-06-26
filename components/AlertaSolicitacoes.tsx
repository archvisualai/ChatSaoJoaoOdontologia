"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SOLICITACAO_TIPO_LABEL } from "@/lib/types";
import type { SolicitacaoTipo } from "@/lib/types";

type Toast = { id: number; tipo: string; nome: string | null };

let audioCtx: AudioContext | null = null;

function ensureAudio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
  return audioCtx;
}

function tocarAlerta() {
  const ctx = ensureAudio();
  if (!ctx) return;
  // dois bipes curtos
  [0, 0.22].forEach((delay) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = "sine";
    o.frequency.value = 880;
    const t = ctx.currentTime + delay;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.start(t);
    o.stop(t + 0.2);
  });
}

export default function AlertaSolicitacoes() {
  const router = useRouter();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const naoVistasRef = useRef(0);
  const tituloOriginalRef = useRef<string>("");
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    tituloOriginalRef.current = document.title;

    // desbloqueia o áudio na primeira interação do usuário
    const desbloquear = () => ensureAudio();
    window.addEventListener("pointerdown", desbloquear, { once: true });
    window.addEventListener("keydown", desbloquear, { once: true });

    const resetTitulo = () => {
      naoVistasRef.current = 0;
      document.title = tituloOriginalRef.current;
    };
    const aoVisibilidade = () => {
      if (document.visibilityState === "visible") resetTitulo();
    };
    window.addEventListener("focus", resetTitulo);
    document.addEventListener("visibilitychange", aoVisibilidade);

    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let authSub: { subscription: { unsubscribe: () => void } } | null = null;
    let cancelled = false;
    const timers = timersRef.current;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session) await supabase.realtime.setAuth(session.access_token);

      // mantém o token do Realtime válido em abas abertas por muito tempo
      authSub = supabase.auth.onAuthStateChange((_event, s) => {
        if (s) supabase.realtime.setAuth(s.access_token);
      }).data;

      channel = supabase
        .channel("alerta-solicitacoes")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "solicitacoes" },
          (payload) => {
            const nova = payload.new as {
              id: number;
              tipo: string;
              nome: string | null;
            };
            tocarAlerta();
            setToasts((prev) => [
              { id: nova.id, tipo: nova.tipo, nome: nova.nome },
              ...prev,
            ]);

            // só marca no título quando a aba não está visível
            if (document.hidden) {
              naoVistasRef.current += 1;
              document.title = `(${naoVistasRef.current}) Nova solicitação — São João`;
            }

            // atualiza os contadores do painel, agrupando rajadas
            if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
            refreshTimerRef.current = setTimeout(() => router.refresh(), 800);

            // remove o toast após 12s
            const tid = setTimeout(() => {
              setToasts((prev) => prev.filter((t) => t.id !== nova.id));
              timers.delete(tid);
            }, 12000);
            timers.add(tid);
          }
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
      if (authSub) authSub.subscription.unsubscribe();
      window.removeEventListener("pointerdown", desbloquear);
      window.removeEventListener("keydown", desbloquear);
      window.removeEventListener("focus", resetTitulo);
      document.removeEventListener("visibilitychange", aoVisibilidade);
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      document.title = tituloOriginalRef.current;
    };
  }, [router]);

  function fechar(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  if (toasts.length === 0) return null;

  return (
    <div className="fixed right-4 top-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((t) => {
        const urgente = t.tipo === "urgencia";
        return (
          <div
            key={t.id}
            className={`rounded-xl border bg-white p-3 shadow-lg ring-1 ${
              urgente
                ? "border-red-200 ring-red-100"
                : "border-brand-200 ring-brand-100"
            }`}
          >
            <div className="flex items-start gap-2">
              <span
                className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm ${
                  urgente
                    ? "bg-red-100 text-red-700"
                    : "bg-brand-100 text-brand-700"
                }`}
              >
                🔔
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">
                  Nova solicitação{urgente ? " · URGÊNCIA" : ""}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {SOLICITACAO_TIPO_LABEL[t.tipo as SolicitacaoTipo] ?? t.tipo}
                  {t.nome ? ` — ${t.nome}` : ""}
                </p>
                <Link
                  href="/solicitacoes"
                  onClick={() => fechar(t.id)}
                  className="mt-1 inline-block text-xs font-medium text-brand-700 hover:underline"
                >
                  Ver solicitações →
                </Link>
              </div>
              <button
                onClick={() => fechar(t.id)}
                aria-label="Fechar"
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
