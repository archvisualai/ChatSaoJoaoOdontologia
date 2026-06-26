import Image from "next/image";
import { redirect } from "next/navigation";
import NavLinks from "@/components/NavLinks";
import LogoutButton from "@/components/LogoutButton";
import AlertaSolicitacoes from "@/components/AlertaSolicitacoes";
import GlobalPauseBanner from "@/components/GlobalPauseBanner";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const isMedica = user.app_metadata?.role === "medica";

  const { data: pausaGlobal } = await supabase
    .from("bot_pausado")
    .select("telefone")
    .eq("telefone", "__GLOBAL__")
    .maybeSingle();

  return (
    <div className="min-h-screen bg-slate-50">
      <AlertaSolicitacoes />
      {/* Sidebar — desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <Image
            src="/logo.png"
            alt="São João Odontologia"
            width={40}
            height={40}
            priority
            className="rounded-xl"
          />
          <div className="leading-tight">
            <p className="text-sm font-semibold text-slate-900">São João</p>
            <p className="text-xs text-slate-500">Odontologia</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Painel
          </p>
          <NavLinks isMedica={isMedica} />
        </div>
        <div className="border-t border-slate-100 p-3">
          <LogoutButton full />
        </div>
      </aside>

      {/* Top bar — mobile */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Image
              src="/logo.png"
              alt="São João Odontologia"
              width={36}
              height={36}
              priority
              className="rounded-lg"
            />
            <p className="text-sm font-semibold text-slate-900">
              São João Odontologia
            </p>
          </div>
          <LogoutButton />
        </div>
        <div className="border-t border-slate-100 px-2 py-2">
          <NavLinks orientation="horizontal" isMedica={isMedica} />
        </div>
      </header>

      {/* Conteúdo */}
      <main className="md:pl-60">
        <GlobalPauseBanner pausado={pausaGlobal !== null} />
        <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
