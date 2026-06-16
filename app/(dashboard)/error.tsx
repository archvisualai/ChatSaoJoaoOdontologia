"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
      <h2 className="text-lg font-semibold text-red-800">
        Algo deu errado
      </h2>
      <p className="mt-1 text-sm text-red-700">
        Não foi possível carregar esta página. Tente novamente.
      </p>
      <button
        onClick={reset}
        className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700"
      >
        Tentar novamente
      </button>
    </div>
  );
}
