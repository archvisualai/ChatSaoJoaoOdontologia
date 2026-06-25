"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWhatsAppText, sendWhatsAppMedia } from "@/lib/evolution";

type ActionResult = { error: string | null };

const GLOBAL_PAUSE = "__GLOBAL__";

export async function setPausaGlobal(pausar: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  if (pausar) {
    const { error } = await supabase.from("bot_pausado").upsert({
      telefone: GLOBAL_PAUSE,
      pausado_por: "secretaria",
      pausado_em: new Date().toISOString(),
    });
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("bot_pausado")
      .delete()
      .eq("telefone", GLOBAL_PAUSE);
    if (error) return { error: error.message };
  }

  revalidatePath("/", "layout");
  return { error: null };
}

export async function registrarSecretaria(
  email: string,
  password: string,
  codigo: string
): Promise<ActionResult> {
  const expected = process.env.SECRETARIA_SIGNUP_CODE;
  if (!expected) return { error: "Cadastro indisponível no momento." };
  if (codigo.trim() !== expected) {
    return { error: "Código de cadastro inválido." };
  }

  const mail = email.trim().toLowerCase();
  if (!mail) return { error: "Informe um e-mail." };
  if (!password || password.length < 8) {
    return { error: "A senha deve ter pelo menos 8 caracteres." };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email: mail,
    password,
    email_confirm: true,
  });

  if (error) {
    if (error.message?.toLowerCase().includes("already")) {
      return { error: "Já existe uma conta com esse e-mail." };
    }
    console.error("registrarSecretaria:", error.message);
    return { error: "Não foi possível criar a conta. Tente novamente." };
  }

  return { error: null };
}

export async function setPausa(
  telefone: string,
  pausar: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  if (pausar) {
    const { error } = await supabase.from("bot_pausado").upsert({
      telefone,
      pausado_por: "secretaria",
      pausado_em: new Date().toISOString(),
    });
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from("bot_pausado")
      .delete()
      .eq("telefone", telefone);
    if (error) return { error: error.message };
  }

  revalidatePath("/conversas");
  revalidatePath(`/conversas/${encodeURIComponent(telefone)}`);
  revalidatePath("/");
  return { error: null };
}

export async function marcarAtendido(id: number): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const { error } = await supabase
    .from("solicitacoes")
    .update({ status: "atendido", atendido_em: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/solicitacoes");
  revalidatePath("/");
  return { error: null };
}

export async function enviarMensagem(
  telefone: string,
  texto: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const msg = texto.trim();
  if (!msg) return { error: "Mensagem vazia." };

  // Só permite enviar para pacientes já existentes (evita uso como relay de WhatsApp).
  const { data: paciente } = await supabase
    .from("pacientes")
    .select("telefone")
    .eq("telefone", telefone)
    .maybeSingle();
  if (!paciente) return { error: "Paciente não encontrado." };

  const result = await sendWhatsAppText(telefone, msg);
  if (!result.ok) return { error: result.error ?? "Falha no envio." };

  const { error: insertError } = await supabase
    .from("mensagens")
    .insert({ telefone, direcao: "enviada", conteudo: msg });

  const { error: pauseError } = await supabase.from("bot_pausado").upsert({
    telefone,
    pausado_por: "secretaria",
    pausado_em: new Date().toISOString(),
  });

  revalidatePath(`/conversas/${encodeURIComponent(telefone)}`);
  revalidatePath("/conversas");
  revalidatePath("/");

  if (pauseError) {
    return {
      error:
        "Mensagem enviada, mas o bot NÃO foi pausado automaticamente. Pause manualmente para evitar respostas duplicadas.",
    };
  }
  if (insertError) {
    return {
      error:
        "Mensagem enviada e bot pausado, mas houve um problema ao registrar no histórico.",
    };
  }
  return { error: null };
}

export async function enviarMidia(
  telefone: string,
  midiaUrl: string,
  tipo: "imagem" | "documento",
  mimetype: string,
  arquivoNome: string,
  legenda: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  if (!midiaUrl) return { error: "Arquivo inválido." };

  const TIPOS_PERMITIDOS = new Set([
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
  ]);
  if (!TIPOS_PERMITIDOS.has(mimetype)) {
    return { error: "Tipo de arquivo não permitido." };
  }

  // Só permite enviar para pacientes já existentes (evita uso como relay de WhatsApp).
  const { data: paciente } = await supabase
    .from("pacientes")
    .select("telefone")
    .eq("telefone", telefone)
    .maybeSingle();
  if (!paciente) return { error: "Paciente não encontrado." };

  const legendaLimpa = legenda.trim();
  const result = await sendWhatsAppMedia(
    telefone,
    midiaUrl,
    tipo === "imagem" ? "image" : "document",
    mimetype,
    arquivoNome,
    legendaLimpa
  );
  if (!result.ok) return { error: result.error ?? "Falha no envio." };

  const { error: insertError } = await supabase.from("mensagens").insert({
    telefone,
    direcao: "enviada",
    conteudo: legendaLimpa || null,
    tipo,
    midia_url: midiaUrl,
    arquivo_nome: arquivoNome,
  });

  const { error: pauseError } = await supabase.from("bot_pausado").upsert({
    telefone,
    pausado_por: "secretaria",
    pausado_em: new Date().toISOString(),
  });

  revalidatePath(`/conversas/${encodeURIComponent(telefone)}`);
  revalidatePath("/conversas");
  revalidatePath("/");

  if (pauseError) {
    return {
      error:
        "Arquivo enviado, mas o bot NÃO foi pausado automaticamente. Pause manualmente para evitar respostas duplicadas.",
    };
  }
  if (insertError) {
    return {
      error:
        "Arquivo enviado e bot pausado, mas houve um problema ao registrar no histórico.",
    };
  }
  return { error: null };
}
