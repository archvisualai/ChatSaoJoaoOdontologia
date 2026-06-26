export type Paciente = {
  telefone: string;
  nome: string | null;
  primeira_interacao: string;
  ultima_interacao: string;
};

export type ConversaEstado = {
  telefone: string;
  estado: string;
  contexto: Record<string, unknown>;
  atualizado_em: string;
};

export type BotPausado = {
  telefone: string;
  pausado_em: string;
  pausado_por: string;
};

export type SolicitacaoTipo =
  | "agendamento"
  | "reagendamento"
  | "cancelamento"
  | "urgencia"
  | "secretaria";

export type SolicitacaoStatus = "pendente" | "atendido";

export function formatTelefone(telefone: string): string {
  const d = (telefone || "").replace(/\D/g, "");
  if (d.startsWith("55") && d.length >= 12) {
    const ddd = d.slice(2, 4);
    const num = d.slice(4);
    return `(${ddd}) ${num.slice(0, num.length - 4)}-${num.slice(-4)}`;
  }
  return telefone.replace("@s.whatsapp.net", "");
}

export const SOLICITACAO_TIPO_LABEL: Record<SolicitacaoTipo, string> = {
  agendamento: "Agendamento",
  reagendamento: "Reagendamento",
  cancelamento: "Cancelamento",
  urgencia: "Urgência",
  secretaria: "Secretaria",
};

export type Solicitacao = {
  id: number;
  telefone: string;
  nome: string | null;
  tipo: SolicitacaoTipo;
  detalhes: string | null;
  status: SolicitacaoStatus;
  criado_em: string;
  atendido_em: string | null;
};

export type MensagemTipo = "texto" | "imagem" | "documento";

export type Mensagem = {
  id: number;
  telefone: string;
  direcao: "recebida" | "enviada";
  conteudo: string | null;
  tipo: MensagemTipo;
  midia_url: string | null;
  arquivo_nome: string | null;
  criado_em: string;
};
