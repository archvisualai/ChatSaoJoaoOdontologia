export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      bot_pausado: {
        Row: {
          pausado_em: string
          pausado_por: string
          telefone: string
        }
        Insert: {
          pausado_em?: string
          pausado_por?: string
          telefone: string
        }
        Update: {
          pausado_em?: string
          pausado_por?: string
          telefone?: string
        }
        Relationships: []
      }
      conversas_estado: {
        Row: {
          atualizado_em: string
          contexto: Json
          estado: string
          telefone: string
        }
        Insert: {
          atualizado_em?: string
          contexto?: Json
          estado?: string
          telefone: string
        }
        Update: {
          atualizado_em?: string
          contexto?: Json
          estado?: string
          telefone?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversas_estado_telefone_fkey"
            columns: ["telefone"]
            isOneToOne: true
            referencedRelation: "pacientes"
            referencedColumns: ["telefone"]
          },
        ]
      }
      mensagens: {
        Row: {
          arquivo_nome: string | null
          conteudo: string | null
          criado_em: string
          direcao: string
          id: number
          midia_url: string | null
          telefone: string
          tipo: string
        }
        Insert: {
          arquivo_nome?: string | null
          conteudo?: string | null
          criado_em?: string
          direcao: string
          id?: number
          midia_url?: string | null
          telefone: string
          tipo?: string
        }
        Update: {
          arquivo_nome?: string | null
          conteudo?: string | null
          criado_em?: string
          direcao?: string
          id?: number
          midia_url?: string | null
          telefone?: string
          tipo?: string
        }
        Relationships: []
      }
      pacientes: {
        Row: {
          nome: string | null
          primeira_interacao: string
          telefone: string
          ultima_interacao: string
        }
        Insert: {
          nome?: string | null
          primeira_interacao?: string
          telefone: string
          ultima_interacao?: string
        }
        Update: {
          nome?: string | null
          primeira_interacao?: string
          telefone?: string
          ultima_interacao?: string
        }
        Relationships: []
      }
      solicitacoes: {
        Row: {
          atendido_em: string | null
          criado_em: string
          detalhes: string | null
          id: number
          nome: string | null
          status: string
          telefone: string
          tipo: string
        }
        Insert: {
          atendido_em?: string | null
          criado_em?: string
          detalhes?: string | null
          id?: number
          nome?: string | null
          status?: string
          telefone: string
          tipo: string
        }
        Update: {
          atendido_em?: string | null
          criado_em?: string
          detalhes?: string | null
          id?: number
          nome?: string | null
          status?: string
          telefone?: string
          tipo?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
