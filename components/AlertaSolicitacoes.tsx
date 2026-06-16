"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Toast = { id: number; tipo: string; nome: string | null };

const TIPO_LABEL: Record<string, string> = {
  agendamento: "Agendamento",
  reagendamento: "Reagendamento",
  cancelamento: "Cancelamento",
  urgencia: "Urgência",
  secretaria: "Secretária",
};

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

  useEffect(() => {
    tituloOriginalRef.current = document.title;

    // desbloqueia o áudio na primeira interação do usuário
    const desbloquear = () => ensureAudio();
    window.addEventListener("pointerdown", desbloquear, { once: true });
    window.addEventListener("keydown", desbloquear, { once: true });

    const aoFocar = () => {
      naoVistasRef.current = 0;
      document.title = tituloOriginalRef.current;
    };
    window.addEventListener("focus", aoFocar);

    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session) await supabase.realtime.setAuth(session.access_token);

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
            naoVistasRef.current += 1;
            document.title = `(${naoVistasRef.current}) Nova solicitação — São João`;
            router.refresh();
            // remove o toast após 12s
            setTimeout(() => {
              setToasts((prev) => prev.filter((t) => t.id !== nova.id));
            }, 12000);
          }
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
      window.removeEventListener("focus", aoFocar);
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
                  {TIPO_LABEL[t.tipo] ?? t.tipo}
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
