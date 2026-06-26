# Página de Estatísticas (Dra.) — Design

**Data:** 2026-06-26
**Status:** Aprovado (design)

## Objetivo

Adicionar ao painel uma página de **Estatísticas dos atendimentos**, restrita à
Dra., com indicadores derivados das solicitações geradas pelo bot do WhatsApp.

## Controle de acesso (papel/role)

- Papel definido via **`app_metadata.role = 'medica'`** do Supabase Auth, gravado
  por admin (service-role). É seguro — o usuário não consegue alterar.
- **Por enquanto, apenas `marlontb@gmail.com`** recebe `role = 'medica'`.
  (A conta da Dra., ex. `talitacardoso003@gmail.com`, pode receber depois.)
- A aba **"Estatísticas"** só aparece para contas `medica`; a página
  (`/estatisticas`) redireciona quem não é `medica` para a Visão geral (`/`).
- Sem tela de gestão de papéis nesta fase (concessão manual via admin).
- _Alternativa considerada:_ tabela `perfis` com coluna `role` — mais flexível
  para múltiplos papéis no futuro, porém desnecessária agora (YAGNI).

## Rota e UI

- Nova rota: `app/(dashboard)/estatisticas/page.tsx` (server component, dentro do
  grupo `(dashboard)` — herda a proteção de login do layout).
- **Seletor de período** no topo: 7 dias / 30 dias / 90 dias / Tudo, via
  `?range=7|30|90|all` (padrão 30). Links no estilo dos filtros de Solicitações.
- Estilo **cards + barras horizontais em CSS puro** (sem dependência de gráfico),
  na paleta `brand` (verde-sálvia).

## Indicadores (no período selecionado)

1. **Cards-resumo:** total de solicitações, pendentes, atendidas, % atendidas,
   tempo médio até atender (de `criado_em` a `atendido_em`).
2. **Por tipo:** barras horizontais (agendamento, reagendamento, cancelamento,
   urgência, secretária) + **evolução por dia** (mini-barras por dia do período).
3. **Procedimentos mais procurados:** ranking de barras (dos agendamentos).
4. **Preferências:** dias da semana (seg–sex) e período (manhã/tarde) mais pedidos.

## Dados

- Tudo calculado **no servidor** a partir da tabela `solicitacoes`, filtrando por
  `criado_em` no período. Volume baixo → busca as linhas e agrega em JS (sem
  SQL/RPC adicional, sem tabela nova).
- **Parsing do campo `detalhes`:** procedimento/dia/período não são colunas; ficam
  no texto dos agendamentos no formato `Procedimento: X | Dia: Y | Período: Z`.
  Os indicadores 3 e 4 extraem esses valores por parsing (formato consistente,
  gerado pelo próprio bot). Entrada malformada é ignorada com segurança.

## Não-objetivos / futuro

- Não há tabela de papéis nem UI de administração de papéis nesta fase.
- Acesso da conta da Dra. (Talita) fica para depois.
- Promover procedimento/dia/período a colunas próprias em `solicitacoes` (e gravá-las
  pelo bot) é uma melhoria futura de robustez — não necessária agora.
- Sem exportação (CSV/PDF) nesta versão.

## Tarefas de implementação (alto nível)

1. Conceder `app_metadata.role = 'medica'` a `marlontb@gmail.com` (admin).
2. Helper de acesso: ler o role do usuário no server (a partir de `getUser()`).
3. Página `/estatisticas`: seletor de período + agregações + render (cards/barras).
4. Nav: mostrar a aba "Estatísticas" só para `medica` (passar flag do layout).
5. Proteção: redirecionar não-`medica` que acessar `/estatisticas`.
6. Verificar (tsc/lint), commit e deploy.
