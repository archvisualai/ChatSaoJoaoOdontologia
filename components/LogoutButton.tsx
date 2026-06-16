"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IconLogout } from "@/components/icons";

export default function LogoutButton({ full = false }: { full?: boolean }) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleLogout}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-700 ${
        full ? "w-full" : ""
      }`}
    >
      <IconLogout className="h-[18px] w-[18px] shrink-0" />
      Sair
    </button>
  );
}
