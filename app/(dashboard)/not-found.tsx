import Link from "next/link";

export default function NotFound() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">
        Não encontrado
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        A conversa ou página que você procura não existe.
      </p>
      <Link
        href="/"
        className="mt-4 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
      >
        Voltar ao início
      </Link>
    </div>
  );
}
