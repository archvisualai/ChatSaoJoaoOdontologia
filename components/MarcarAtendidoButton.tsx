"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { marcarAtendido } from "@/lib/actions";

export default function MarcarAtendidoButton({ id }: { id: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await marcarAtendido(id);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="whitespace-nowrap rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Salvando..." : "Marcar como atendido"}
      </button>
      {error && (
        <span className="text-[11px] text-red-600">Falha ao salvar</span>
      )}
    </div>
  );
}
