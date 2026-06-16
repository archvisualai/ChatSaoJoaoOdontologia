"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { enviarMensagem, enviarMidia } from "@/lib/actions";
import PausarBotToggle from "@/components/PausarBotToggle";

const EMOJIS = [
  "😊", "😀", "😉", "😅", "😂", "🥰", "😍", "👍",
  "🙏", "🦷", "✨", "❤️", "🎉", "📅", "⏰", "✅",
  "😟", "😢", "🤙", "📍", "💬", "🤍", "👋", "🔝",
];

const MAX_BYTES = 16 * 1024 * 1024; // 16 MB

export default function Composer({
  telefone,
  pausado,
}: {
  telefone: string;
  pausado: boolean;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [texto, setTexto] = useState("");
  const [isPending, startTransition] = useTransition();
  const [enviandoArquivo, setEnviandoArquivo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmojis, setShowEmojis] = useState(false);

  const busy = isPending || enviandoArquivo;

  function handleSend() {
    if (busy) return;
    const msg = texto.trim();
    if (!msg) return;

    setError(null);
    startTransition(async () => {
      const result = await enviarMensagem(telefone, msg);
      if (result.error) {
        setError(result.error);
        return;
      }
      setTexto("");
      setError(null);
      router.refresh();
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function addEmoji(emoji: string) {
    setTexto((t) => t + emoji);
    setShowEmojis(false);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    if (file.size > MAX_BYTES) {
      setError("Arquivo muito grande (máximo 16 MB).");
      return;
    }

    setEnviandoArquivo(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const ext = file.name.includes(".") ? `.${file.name.split(".").pop()}` : "";
      const path = `${user?.id ?? "anon"}/${telefone.replace(
        /\D/g,
        ""
      )}/${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

      const { error: upErr } = await supabase.storage
        .from("anexos")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) {
        setError(`Falha ao enviar o arquivo: ${upErr.message}`);
        return;
      }

      const { data: pub } = supabase.storage.from("anexos").getPublicUrl(path);
      const tipo = file.type.startsWith("image/") ? "imagem" : "documento";

      const result = await enviarMidia(
        telefone,
        pub.publicUrl,
        tipo,
        file.type || "application/octet-stream",
        file.name,
        texto.trim()
      );
      if (result.error) {
        setError(result.error);
        return;
      }

      setTexto("");
      setError(null);
      router.refresh();
    } catch {
      setError("Falha ao enviar o arquivo.");
    } finally {
      setEnviandoArquivo(false);
    }
  }

  return (
    <div className="space-y-1">
      {showEmojis && (
        <div className="flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => addEmoji(emoji)}
              className="rounded-lg px-1.5 py-1 text-xl leading-none hover:bg-slate-100"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-1.5 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <button
          type="button"
          onClick={() => setShowEmojis((s) => !s)}
          disabled={busy}
          title="Emojis"
          aria-label="Inserir emoji"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg hover:bg-slate-100 disabled:opacity-60"
        >
          😊
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          title="Anexar foto ou documento"
          aria-label="Anexar foto ou documento"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg hover:bg-slate-100 disabled:opacity-60"
        >
          📎
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt"
          className="hidden"
          onChange={handleFile}
        />

        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={busy}
          rows={1}
          aria-label="Mensagem para o paciente"
          placeholder="Digite uma mensagem..."
          className="flex-1 resize-none rounded-xl border border-transparent px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-600 focus:outline-none disabled:opacity-60"
        />

        <PausarBotToggle telefone={telefone} pausado={pausado} />

        <button
          onClick={handleSend}
          disabled={busy || !texto.trim()}
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Enviando..." : "Enviar"}
        </button>
      </div>

      {enviandoArquivo && (
        <p className="text-[11px] text-slate-500">Enviando arquivo...</p>
      )}
      {error && (
        <p aria-live="polite" className="text-[11px] text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
