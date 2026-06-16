import "server-only";

type SendResult = { ok: boolean; error?: string };

export async function sendWhatsAppText(
  telefone: string,
  texto: string
): Promise<SendResult> {
  const apiUrl = process.env.EVOLUTION_API_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE;

  if (!apiUrl || !apiKey || !instance) {
    return { ok: false, error: "Evolution API não configurada." };
  }

  const number = telefone.replace("@s.whatsapp.net", "").replace(/\D/g, "");

  try {
    const res = await fetch(
      `${apiUrl}/message/sendText/${instance}`,
      {
        method: "POST",
        headers: {
          apikey: apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ number, text: texto }),
      }
    );

    if (!res.ok) {
      return { ok: false, error: `Falha no envio (${res.status})` };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível conectar à Evolution API." };
  }
}

export async function sendWhatsAppMedia(
  telefone: string,
  midiaUrl: string,
  mediatype: "image" | "document",
  mimetype: string,
  fileName: string,
  caption: string
): Promise<SendResult> {
  const apiUrl = process.env.EVOLUTION_API_URL;
  const apiKey = process.env.EVOLUTION_API_KEY;
  const instance = process.env.EVOLUTION_INSTANCE;

  if (!apiUrl || !apiKey || !instance) {
    return { ok: false, error: "Evolution API não configurada." };
  }

  const number = telefone.replace("@s.whatsapp.net", "").replace(/\D/g, "");

  try {
    const res = await fetch(`${apiUrl}/message/sendMedia/${instance}`, {
      method: "POST",
      headers: {
        apikey: apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        number,
        mediatype,
        mimetype,
        media: midiaUrl,
        fileName,
        caption: caption || undefined,
      }),
    });

    if (!res.ok) {
      return { ok: false, error: `Falha no envio (${res.status})` };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível conectar à Evolution API." };
  }
}
