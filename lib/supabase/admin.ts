import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// SERVER-ONLY: usa a chave service-role (bypassa RLS e cria usuários).
// NUNCA importe este arquivo de um componente client. Só deve ser usado
// dentro de server actions / route handlers.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
