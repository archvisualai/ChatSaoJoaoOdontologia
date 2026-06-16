// Generates the full workflow JSON for "Bot Menu - Cloudy - Sao Joao Odontologia"
const fs = require('fs');

const PG_CRED = { id: "02KjbxDnwalkH1ES", name: "Supabase_SaoJoao_Postgres" };
const EVO_CRED = { id: "qoEWUNnosZjk2ehK", name: "WhatsAppTesteBot" };
const INSTANCE = "WhatsAppTesteBot";
const SECRETARIA_NUM = "5548999594348";

let nodes = [];
let connections = {};
let idCounter = 1;
function nid() { return `n${idCounter++}-${Math.random().toString(36).slice(2,8)}`; }

function addNode(node) {
  nodes.push(node);
  return node;
}
function connect(from, to, fromOutput = 0, toInput = 0) {
  connections[from] = connections[from] || { main: [] };
  while (connections[from].main.length <= fromOutput) connections[from].main.push([]);
  connections[from].main[fromOutput].push({ node: to, type: "main", index: toInput });
}

// ---------- Layout constants ----------
const COL_W = 260;
const ROW_H = 260;
const BASE_X = -3200;
const BASE_Y = -2800;

// =========================================================
// CORE PIPELINE
// =========================================================

addNode({
  id: nid(), name: "Webhook", type: "n8n-nodes-base.webhook", typeVersion: 2,
  position: [BASE_X, BASE_Y],
  parameters: { httpMethod: "POST", path: "bot-saojoao-cloudy", options: {} },
  webhookId: "b1a1c2d3-e4f5-46a7-88b9-c0d1e2f3a4b5"
});

addNode({
  id: nid(), name: "Coleta", type: "n8n-nodes-base.code", typeVersion: 2,
  position: [BASE_X + COL_W, BASE_Y],
  parameters: { jsCode:
`const body = $input.first().json.body || $input.first().json;
const data = body.data || body;
const nome = data.pushName || data.senderName || 'Paciente';
const telefone = data.key && data.key.remoteJid ? data.key.remoteJid : (data.remoteJid || '');
const mensagem = (data.message && data.message.conversation ? data.message.conversation :
  (data.message && data.message.extendedTextMessage ? data.message.extendedTextMessage.text :
  (data.text || ''))).trim();
const fromMe = data.key && data.key.fromMe ? true : false;
return [{ json: { nome, telefone, mensagem, fromMe } }];`
  }
});
connect("Webhook", "Coleta");

addNode({
  id: nid(), name: "Normaliza", type: "n8n-nodes-base.code", typeVersion: 2,
  position: [BASE_X + COL_W * 2, BASE_Y],
  parameters: { jsCode:
`const nome = $json.nome || '';
const telefone = $json.telefone || '';
const mensagem = $json.mensagem || '';
const fromMe = $json.fromMe || false;

const msgNorm = mensagem.toLowerCase()
  .normalize('NFD').replace(/[\\u0300-\\u036f]/g, '')
  .replace(/[^a-z0-9\\s#]/g, '').trim();

const isPausar = fromMe && msgNorm.includes('pausar');
const isRetomar = fromMe && msgNorm.includes('retomar');

return [{ json: { nome, telefone, mensagem, msgNorm, fromMe, isPausar, isRetomar, isComando: isPausar || isRetomar } }];`
  }
});
connect("Coleta", "Normaliza");

// IF: e comando da secretaria (pausar/retomar)?
addNode({
  id: nid(), name: "E comando?", type: "n8n-nodes-base.if", typeVersion: 2,
  position: [BASE_X + COL_W * 3, BASE_Y],
  parameters: {
    conditions: {
      options: { caseSensitive: false, leftValue: "", typeValidation: "loose", version: 2 },
      conditions: [{
        leftValue: "={{ $json.isComando }}", rightValue: true,
        operator: { type: "boolean", operation: "equals" }, id: nid()
      }],
      combinator: "and"
    },
    options: {}
  }
});
connect("Normaliza", "E comando?");

// TRUE branch: E pausar?
addNode({
  id: nid(), name: "E pausar?", type: "n8n-nodes-base.if", typeVersion: 2,
  position: [BASE_X + COL_W * 4, BASE_Y - 180],
  parameters: {
    conditions: {
      options: { caseSensitive: false, leftValue: "", typeValidation: "loose", version: 2 },
      conditions: [{
        leftValue: "={{ $json.isPausar }}", rightValue: true,
        operator: { type: "boolean", operation: "equals" }, id: nid()
      }],
      combinator: "and"
    },
    options: {}
  }
});
connect("E comando?", "E pausar?", 0, 0);

addNode({
  id: nid(), name: "Pausa bot", type: "n8n-nodes-base.postgres", typeVersion: 2.6,
  position: [BASE_X + COL_W * 5, BASE_Y - 280],
  parameters: {
    operation: "upsert",
    schema: { __rl: true, value: "public", mode: "list" },
    table: { __rl: true, value: "bot_pausado", mode: "list", cachedResultName: "bot_pausado" },
    columns: {
      mappingMode: "defineBelow",
      value: { telefone: "={{ $json.telefone }}", pausado_em: "={{ $now }}", pausado_por: "secretaria" },
      matchingColumns: ["telefone"],
      schema: [
        { id: "telefone", displayName: "telefone", required: false, defaultMatch: true, display: true, type: "string", canBeUsedToMatch: true },
        { id: "pausado_em", displayName: "pausado_em", required: false, defaultMatch: false, display: true, type: "dateTime", canBeUsedToMatch: false },
        { id: "pausado_por", displayName: "pausado_por", required: false, defaultMatch: false, display: true, type: "string", canBeUsedToMatch: false }
      ],
      attemptToConvertTypes: false, convertFieldsToString: false
    },
    options: {}
  },
  credentials: { postgres: PG_CRED },
  continueOnFail: true
});
connect("E pausar?", "Pausa bot", 0, 0);

addNode({
  id: nid(), name: "Retoma bot", type: "n8n-nodes-base.postgres", typeVersion: 2.6,
  position: [BASE_X + COL_W * 5, BASE_Y - 80],
  parameters: {
    operation: "executeQuery",
    query: "=DELETE FROM public.bot_pausado WHERE telefone = '{{ $json.telefone }}'",
    options: {}
  },
  credentials: { postgres: PG_CRED },
  continueOnFail: true
});
connect("E pausar?", "Retoma bot", 1, 0);

// FALSE branch from "E comando?": continue normal flow -> Log recebida
addNode({
  id: nid(), name: "Log recebida", type: "n8n-nodes-base.postgres", typeVersion: 2.6,
  position: [BASE_X + COL_W * 4, BASE_Y + 60],
  parameters: {
    operation: "insert",
    schema: { __rl: true, value: "public", mode: "list" },
    table: { __rl: true, value: "mensagens", mode: "list", cachedResultName: "mensagens" },
    columns: {
      mappingMode: "defineBelow",
      value: {
        telefone: "={{ $json.telefone }}",
        direcao: "recebida",
        conteudo: "={{ $json.mensagem }}"
      },
      matchingColumns: ["id"],
      schema: [
        { id: "telefone", displayName: "telefone", required: false, defaultMatch: false, display: true, type: "string", canBeUsedToMatch: true },
        { id: "direcao", displayName: "direcao", required: false, defaultMatch: false, display: true, type: "string", canBeUsedToMatch: true },
        { id: "conteudo", displayName: "conteudo", required: false, defaultMatch: false, display: true, type: "string", canBeUsedToMatch: true }
      ],
      attemptToConvertTypes: false, convertFieldsToString: false
    },
    options: {}
  },
  credentials: { postgres: PG_CRED },
  continueOnFail: true,
  alwaysOutputData: true
});
connect("E comando?", "Log recebida", 1, 0);

// Verifica pausa
addNode({
  id: nid(), name: "Verifica pausa", type: "n8n-nodes-base.postgres", typeVersion: 2.6,
  position: [BASE_X + COL_W * 5, BASE_Y + 60],
  parameters: {
    operation: "select",
    schema: { __rl: true, value: "public", mode: "list" },
    table: { __rl: true, value: "bot_pausado", mode: "list", cachedResultName: "bot_pausado" },
    limit: 1,
    where: { values: [{ column: "telefone", value: "={{ $('Coleta').item.json.telefone }}" }] },
    options: {}
  },
  credentials: { postgres: PG_CRED },
  alwaysOutputData: true,
  continueOnFail: true
});
connect("Log recebida", "Verifica pausa");

addNode({
  id: nid(), name: "Restaura dados", type: "n8n-nodes-base.code", typeVersion: 2,
  position: [BASE_X + COL_W * 6, BASE_Y + 60],
  parameters: { jsCode:
`const pausaRow = $input.first().json;
const nome = $('Coleta').item.json.nome || '';
const telefone = $('Coleta').item.json.telefone || '';
const mensagem = $('Coleta').item.json.mensagem || '';
const msgNorm = $('Normaliza').item.json.msgNorm || '';

const estaPausado = !!(pausaRow && pausaRow.telefone);

return [{ json: { nome, telefone, mensagem, msgNorm, estaPausado } }];`
  }
});
connect("Verifica pausa", "Restaura dados");

addNode({
  id: nid(), name: "Bot pausado?", type: "n8n-nodes-base.if", typeVersion: 2,
  position: [BASE_X + COL_W * 7, BASE_Y + 60],
  parameters: {
    conditions: {
      options: { caseSensitive: false, leftValue: "", typeValidation: "loose", version: 2 },
      conditions: [{
        leftValue: "={{ $json.estaPausado }}", rightValue: true,
        operator: { type: "boolean", operation: "equals" }, id: nid()
      }],
      combinator: "and"
    },
    options: {}
  }
});
connect("Restaura dados", "Bot pausado?");
// true output (0) -> nothing (ends). false output (1) -> continue

// Upsert pacientes
addNode({
  id: nid(), name: "Upsert paciente", type: "n8n-nodes-base.postgres", typeVersion: 2.6,
  position: [BASE_X + COL_W * 8, BASE_Y + 60],
  parameters: {
    operation: "upsert",
    schema: { __rl: true, value: "public", mode: "list" },
    table: { __rl: true, value: "pacientes", mode: "list", cachedResultName: "pacientes" },
    columns: {
      mappingMode: "defineBelow",
      value: {
        telefone: "={{ $json.telefone }}",
        nome: "={{ $json.nome }}",
        ultima_interacao: "={{ $now }}"
      },
      matchingColumns: ["telefone"],
      schema: [
        { id: "telefone", displayName: "telefone", required: false, defaultMatch: true, display: true, type: "string", canBeUsedToMatch: true },
        { id: "nome", displayName: "nome", required: false, defaultMatch: false, display: true, type: "string", canBeUsedToMatch: false },
        { id: "ultima_interacao", displayName: "ultima_interacao", required: false, defaultMatch: false, display: true, type: "dateTime", canBeUsedToMatch: false }
      ],
      attemptToConvertTypes: false, convertFieldsToString: false
    },
    options: {}
  },
  credentials: { postgres: PG_CRED },
  continueOnFail: true
});
connect("Bot pausado?", "Upsert paciente", 1, 0);

// Busca conversas_estado
addNode({
  id: nid(), name: "Busca estado", type: "n8n-nodes-base.postgres", typeVersion: 2.6,
  position: [BASE_X + COL_W * 9, BASE_Y + 60],
  parameters: {
    operation: "select",
    schema: { __rl: true, value: "public", mode: "list" },
    table: { __rl: true, value: "conversas_estado", mode: "list", cachedResultName: "conversas_estado" },
    limit: 1,
    where: { values: [{ column: "telefone", value: "={{ $('Coleta').item.json.telefone }}" }] },
    options: {}
  },
  credentials: { postgres: PG_CRED },
  alwaysOutputData: true,
  continueOnFail: true
});
connect("Upsert paciente", "Busca estado");

// Monta contexto
addNode({
  id: nid(), name: "Monta contexto", type: "n8n-nodes-base.code", typeVersion: 2,
  position: [BASE_X + COL_W * 10, BASE_Y + 60],
  parameters: { jsCode:
`const nome = $('Coleta').item.json.nome || '';
const telefone = $('Coleta').item.json.telefone || '';
const mensagem = $('Coleta').item.json.mensagem || '';
const msgNorm = $('Normaliza').item.json.msgNorm || '';

let estado = 'menu';
let contexto = {};

try {
  const rows = $('Busca estado').all();
  if (rows && rows.length > 0) {
    const row = rows[0].json;
    if (row && row.telefone) {
      estado = row.estado || 'menu';
      contexto = row.contexto || {};
      if (typeof contexto === 'string') {
        try { contexto = JSON.parse(contexto); } catch(e) { contexto = {}; }
      }
    }
  }
} catch(e) {
  estado = 'menu';
  contexto = {};
}

return [{ json: { nome, telefone, mensagem, msgNorm, estado, contexto } }];`
  }
});
connect("Busca estado", "Monta contexto");

// Roteador
addNode({
  id: nid(), name: "Roteador", type: "n8n-nodes-base.code", typeVersion: 2,
  position: [BASE_X + COL_W * 11, BASE_Y + 60],
  parameters: { jsCode:
`const msg = $json.msgNorm || '';
const msgRaw = ($('Coleta').item.json.mensagem || '').trim();
const estado = $json.estado || 'menu';
let contexto = Object.assign({}, $json.contexto || {});

// 'menu' a qualquer momento volta pro menu inicial
if (msg === 'menu') {
  return [{ json: { ...$json, contexto, rota: 'menu' } }];
}

function out(rota, extra) {
  return [{ json: { ...$json, contexto: Object.assign({}, contexto, extra || {}), rota } }];
}

if (estado === 'menu') {
  const mapa = { '1':'agendar_proc', '2':'reagendar', '3':'procedimentos', '4':'valores', '5':'localizacao', '6':'urgencia', '7':'secretaria' };
  return out(mapa[msg] || 'invalido');
}

if (estado === 'agendar_proc') {
  if (!msgRaw) return out('invalido');
  return out('agendar_dia', { procedimento: msgRaw });
}

if (estado === 'agendar_dia') {
  if (!msgRaw) return out('invalido');
  return out('agendar_periodo', { dia: msgRaw });
}

if (estado === 'agendar_periodo') {
  if (!msgRaw) return out('invalido');
  return out('agendar_confirma', { periodo: msgRaw });
}

if (estado === 'agendar_confirma') {
  if (msg === '1') return out('agendar_ok');
  if (msg === '2') return out('agendar_proc');
  return out('invalido');
}

if (estado === 'procedimentos') {
  if (msg === '1') return out('proc_odonto');
  if (msg === '2') return out('proc_estetica');
  if (msg === '0') return out('menu');
  return out('invalido');
}

if (estado === 'proc_odonto' || estado === 'proc_estetica') {
  if (msg === '0') return out('menu');
  return out(estado); // redisplay same listing
}

if (estado === 'valores') {
  if (msg === '1') return out('agendar_proc');
  if (msg === '0') return out('menu');
  return out('invalido');
}

if (estado === 'localizacao' || estado === 'urgencia') {
  if (msg === '0') return out('menu');
  return out(estado); // redisplay
}

if (estado === 'reagendar') {
  if (!msgRaw) return out('invalido');
  const cancelKeywords = ['cancel'];
  const isCancel = cancelKeywords.some(k => msg.includes(k));
  return out('reagendar_ok', { pedido: msgRaw, tipoSolicitacao: isCancel ? 'cancelamento' : 'reagendamento' });
}

if (estado === 'secretaria') {
  if (!msgRaw) return out('invalido');
  return out('secretaria_ok', { assunto: msgRaw });
}

// fallback
return out('menu');`
  }
});
connect("Monta contexto", "Roteador");

// =========================================================
// SWITCH - all branches
// =========================================================
const ROTAS = [
  'menu','agendar_proc','agendar_dia','agendar_periodo','agendar_confirma','agendar_ok',
  'procedimentos','proc_odonto','proc_estetica','valores','localizacao','urgencia',
  'reagendar','reagendar_ok','secretaria','secretaria_ok','invalido'
];

addNode({
  id: nid(), name: "Switch", type: "n8n-nodes-base.switch", typeVersion: 3.3,
  position: [BASE_X + COL_W * 12, BASE_Y + 60],
  parameters: {
    rules: {
      values: ROTAS.map(rota => ({
        conditions: {
          options: { caseSensitive: false, leftValue: "", typeValidation: "loose", version: 2 },
          conditions: [{
            leftValue: "={{ $json.rota }}", rightValue: rota,
            operator: { type: "string", operation: "equals" }, id: nid()
          }],
          combinator: "and"
        },
        renameOutput: true,
        outputKey: rota
      }))
    },
    looseTypeValidation: true,
    options: {}
  }
});
connect("Roteador", "Switch");

// =========================================================
// BRANCH MESSAGES + STATE TRANSITIONS
// =========================================================

const MENU_TEXT = `Olá! 👋 Bem-vindo(a) à *São João Odontologia*!

Escolha uma opção digitando o número:

1️⃣ Agendar consulta
2️⃣ Reagendar ou cancelar
3️⃣ Procedimentos e tratamentos
4️⃣ Valores e formas de pagamento
5️⃣ Endereço e horário de funcionamento
6️⃣ Urgência / emergência
7️⃣ Falar com a secretária

_Digite o número da opção desejada_ 😊`;

const PROC_ODONTO_TEXT = `*🦷 Odontologia*

- *Limpeza Dental (Profilaxia)* - remove placa, tártaro e manchas (~45min). Sem flúor, com enxaguante natural à base de ervas.
- *Restaurações em Resina Composta* - reconstrói dentes danificados com resultado natural.
- *Facetas em Resina Composta* - corrige cor, forma e alinhamento, podendo ser feitas em uma única consulta.
- *Implante Dental Unitário* - substitui a raiz do dente com titânio.
- *Prótese Protocolo* - prótese fixa sobre implantes para arcada completa.
- *Aparelhos Ortodônticos* - metálicos e estéticos para corrigir mordida e alinhar dentes.
- *Alinhadores Invisíveis* - removíveis, transparentes e confortáveis.
- *Tratamento Endodôntico (Canal)* - com a Dra. Talita, 20 anos de experiência.
- *Tratamento para Bruxismo* - placas oclusais e abordagem integrativa personalizada.
- *Remoção de Sisos* - indicada para dor, inflamação ou antes de ortodontia.
- *Periodontia* - tratamento de gengivas e tecidos de suporte.
- *Gengivoplastia* - remodelamento gengival para harmonizar o sorriso.
- *Clareamento Dental Caseiro* - moldeiras personalizadas, acessível e seguro.
- *Clareamento Dental a Laser* - gel ativado por laser, de 1 a 7 sessões.

Digite *0* para voltar ao menu.`;

const PROC_ESTETICA_TEXT = `*💆 Estética e Harmonização Facial*

- *Harmonização Facial* - equilibra proporções e valoriza pontos da face.
- *Preenchimento de Queixo* - ácido hialurônico, resultado imediato, dura 9 a 18 meses.
- *Preenchimento Labial* - volume e contorno dos lábios, resultado imediato.
- *Botox* - relaxa músculos faciais e suaviza rugas e linhas de expressão.
- *Bioestimulador de Colágeno* - pele mais firme e jovem, efeito até 2 anos ou mais.
- *Fios de PDO* - estimulam colágeno com efeito lifting não cirúrgico.
- *Peeling Químico* - renova a pele, indicado para manchas, rugas e cicatrizes.
- *Microagulhamento Facial* - melhora firmeza, textura, manchas e poros.

Digite *0* para voltar ao menu.`;

const VALORES_TEXT = `*💰 Valores e Formas de Pagamento*

A consulta de avaliação é *totalmente gratuita* 🎉 — você conhece a clínica, conversa com os profissionais e recebe um diagnóstico personalizado sem custo.

Possuímos *aparelho de Raio-X* próprio: *R$ 50,00* (quando necessário).

*Descontos disponíveis:*
- Parceiros do *Convênio Vida Cotidiana* → 10% de desconto em qualquer procedimento
- *Limpeza, restauração e canal* pagos à vista → 15% de desconto

Para os demais procedimentos, o valor é definido após a avaliação presencial gratuita 😊

1️⃣ Quero agendar a avaliação gratuita
0️⃣ Voltar ao menu`;

const LOCALIZACAO_TEXT = `*📍 Endereço e Horário de Funcionamento*

*Endereço:* Rua São João, 1366 – Bairro São João, Margem Esquerda, Tubarão – SC

*Como chegar:*
🗺️ Google Maps: https://bit.ly/maps_saojoaoodontologia
🧭 Waze: https://bit.ly/waze_saojoaoodontologia
🚗 Uber: pesquise por _"São João Odontologia"_

*⏰ Horário de funcionamento:*
- Segunda a Quinta: 09h00 às 18h30
- Sexta-feira: 09h00 às 17h00
- Sábados e Domingos: Fechado

Digite *0* para voltar ao menu.`;

const URGENCIA_TEXT = `😟 Entendemos que isso pode ser desconfortável.

Para *urgências e emergências*, ligue imediatamente para a clínica:

📞 *(48) 3302-5012*

Nossa equipe verificará a disponibilidade de atendimento de urgência o quanto antes.

_Se estiver fora do horário de funcionamento, procure a UPA ou pronto-socorro mais próximo._

Já avisamos nossa equipe sobre o seu contato 🙏

Digite *0* para voltar ao menu.`;

const INVALIDO_TEXT = `Não entendi 😅 Digite o número de uma das opções do menu.

1️⃣ Agendar consulta
2️⃣ Reagendar ou cancelar
3️⃣ Procedimentos e tratamentos
4️⃣ Valores e formas de pagamento
5️⃣ Endereço e horário de funcionamento
6️⃣ Urgência / emergência
7️⃣ Falar com a secretária`;

// helper to build "Salva estado" postgres upsert node
function salvaEstado(name, x, y, estadoExpr, contextoExpr) {
  return addNode({
    id: nid(), name, type: "n8n-nodes-base.postgres", typeVersion: 2.6,
    position: [x, y],
    parameters: {
      operation: "upsert",
      schema: { __rl: true, value: "public", mode: "list" },
      table: { __rl: true, value: "conversas_estado", mode: "list", cachedResultName: "conversas_estado" },
      columns: {
        mappingMode: "defineBelow",
        value: {
          telefone: "={{ $('Coleta').item.json.telefone }}",
          estado: estadoExpr,
          contexto: contextoExpr,
          atualizado_em: "={{ $now }}"
        },
        matchingColumns: ["telefone"],
        schema: [
          { id: "telefone", displayName: "telefone", required: false, defaultMatch: true, display: true, type: "string", canBeUsedToMatch: true },
          { id: "estado", displayName: "estado", required: false, defaultMatch: false, display: true, type: "string", canBeUsedToMatch: false },
          { id: "contexto", displayName: "contexto", required: false, defaultMatch: false, display: true, type: "object", canBeUsedToMatch: false },
          { id: "atualizado_em", displayName: "atualizado_em", required: false, defaultMatch: false, display: true, type: "dateTime", canBeUsedToMatch: false }
        ],
        attemptToConvertTypes: false, convertFieldsToString: false
      },
      options: {}
    },
    credentials: { postgres: PG_CRED },
    continueOnFail: true
  });
}

// helper to build Evolution API "send text" node
function enviaMsg(name, x, y, messageText) {
  return addNode({
    id: nid(), name, type: "n8n-nodes-evolution-api.evolutionApi", typeVersion: 1,
    position: [x, y],
    parameters: {
      resource: "messages-api",
      instanceName: INSTANCE,
      remoteJid: "={{ $('Coleta').item.json.telefone }}",
      messageText: messageText,
      options_message: {}
    },
    credentials: { evolutionApi: EVO_CRED }
  });
}

// helper to build "Log enviada" postgres insert node
function logEnviada(name, x, y, conteudoExpr) {
  return addNode({
    id: nid(), name, type: "n8n-nodes-base.postgres", typeVersion: 2.6,
    position: [x, y],
    parameters: {
      operation: "insert",
      schema: { __rl: true, value: "public", mode: "list" },
      table: { __rl: true, value: "mensagens", mode: "list", cachedResultName: "mensagens" },
      columns: {
        mappingMode: "defineBelow",
        value: {
          telefone: "={{ $('Coleta').item.json.telefone }}",
          direcao: "enviada",
          conteudo: conteudoExpr
        },
        matchingColumns: ["id"],
        schema: [
          { id: "telefone", displayName: "telefone", required: false, defaultMatch: false, display: true, type: "string", canBeUsedToMatch: true },
          { id: "direcao", displayName: "direcao", required: false, defaultMatch: false, display: true, type: "string", canBeUsedToMatch: true },
          { id: "conteudo", displayName: "conteudo", required: false, defaultMatch: false, display: true, type: "string", canBeUsedToMatch: true }
        ],
        attemptToConvertTypes: false, convertFieldsToString: false
      },
      options: {}
    },
    credentials: { postgres: PG_CRED },
    continueOnFail: true
  });
}

// helper to build "Insere solicitacao" postgres insert node
function insereSolicitacao(name, x, y, tipo, detalhesExpr) {
  return addNode({
    id: nid(), name, type: "n8n-nodes-base.postgres", typeVersion: 2.6,
    position: [x, y],
    parameters: {
      operation: "insert",
      schema: { __rl: true, value: "public", mode: "list" },
      table: { __rl: true, value: "solicitacoes", mode: "list", cachedResultName: "solicitacoes" },
      columns: {
        mappingMode: "defineBelow",
        value: {
          telefone: "={{ $('Coleta').item.json.telefone }}",
          nome: "={{ $('Coleta').item.json.nome }}",
          tipo: tipo,
          detalhes: detalhesExpr
        },
        matchingColumns: ["id"],
        schema: [
          { id: "telefone", displayName: "telefone", required: false, defaultMatch: false, display: true, type: "string", canBeUsedToMatch: true },
          { id: "nome", displayName: "nome", required: false, defaultMatch: false, display: true, type: "string", canBeUsedToMatch: true },
          { id: "tipo", displayName: "tipo", required: false, defaultMatch: false, display: true, type: "string", canBeUsedToMatch: true },
          { id: "detalhes", displayName: "detalhes", required: false, defaultMatch: false, display: true, type: "string", canBeUsedToMatch: true }
        ],
        attemptToConvertTypes: false, convertFieldsToString: false
      },
      options: {}
    },
    credentials: { postgres: PG_CRED },
    continueOnFail: true
  });
}

// helper to build "Notifica secretaria" Evolution API node
function notificaSecretaria(name, x, y, messageText) {
  return addNode({
    id: nid(), name, type: "n8n-nodes-evolution-api.evolutionApi", typeVersion: 1,
    position: [x, y],
    parameters: {
      resource: "messages-api",
      instanceName: INSTANCE,
      remoteJid: SECRETARIA_NUM,
      messageText: messageText,
      options_message: {}
    },
    credentials: { evolutionApi: EVO_CRED }
  });
}

// Output index map for switch (order of ROTAS)
const ROTA_OUT = {};
ROTAS.forEach((r, i) => ROTA_OUT[r] = i);

const X0 = BASE_X + COL_W * 13;
const Y0 = BASE_Y - 1600; // top row for branches, each branch gets its own row band

// ---- BRANCH: menu ----
{
  const y = Y0 + 0 * ROW_H;
  const s = salvaEstado("Salva menu", X0, y, "menu", "={{ JSON.stringify({}) }}");
  const e = enviaMsg("Envia menu", X0 + COL_W, y, MENU_TEXT);
  const l = logEnviada("Log enviada menu", X0 + COL_W * 2, y, `={{ ${JSON.stringify(MENU_TEXT)} }}`);
  connect("Switch", s.name, ROTA_OUT['menu'], 0);
  connect(s.name, e.name);
  connect(e.name, l.name);
}

// ---- BRANCH: agendar_proc (prompt for procedimento) ----
{
  const y = Y0 + 1 * ROW_H;
  const txt = `Ótimo! Vamos agendar sua consulta 😊🦷

Qual *procedimento* você gostaria de agendar?
_(ex: avaliação gratuita, limpeza, ortodontia, estética...)_

✳️ *Voltar ao menu* -> digite *menu*`;
  const s = salvaEstado("Salva agendar_proc", X0, y, "agendar_proc", "={{ JSON.stringify($json.contexto || {}) }}");
  const e = enviaMsg("Envia agendar_proc", X0 + COL_W, y, txt);
  const l = logEnviada("Log enviada agendar_proc", X0 + COL_W * 2, y, `={{ ${JSON.stringify(txt)} }}`);
  connect("Switch", s.name, ROTA_OUT['agendar_proc'], 0);
  connect(s.name, e.name);
  connect(e.name, l.name);
}

// ---- BRANCH: agendar_dia (prompt for dia) ----
{
  const y = Y0 + 2 * ROW_H;
  const txt = `Perfeito! 📅 Qual o *melhor dia* para você?
_(ex: segunda-feira, 20/06, próxima semana...)_

✳️ *Voltar ao menu* -> digite *menu*`;
  const s = salvaEstado("Salva agendar_dia", X0, y, "agendar_dia", "={{ JSON.stringify($json.contexto || {}) }}");
  const e = enviaMsg("Envia agendar_dia", X0 + COL_W, y, txt);
  const l = logEnviada("Log enviada agendar_dia", X0 + COL_W * 2, y, `={{ ${JSON.stringify(txt)} }}`);
  connect("Switch", s.name, ROTA_OUT['agendar_dia'], 0);
  connect(s.name, e.name);
  connect(e.name, l.name);
}

// ---- BRANCH: agendar_periodo (prompt for periodo) ----
{
  const y = Y0 + 3 * ROW_H;
  const txt = `⏰ Você prefere *manhã* ou *tarde*?

✳️ *Voltar ao menu* -> digite *menu*`;
  const s = salvaEstado("Salva agendar_periodo", X0, y, "agendar_periodo", "={{ JSON.stringify($json.contexto || {}) }}");
  const e = enviaMsg("Envia agendar_periodo", X0 + COL_W, y, txt);
  const l = logEnviada("Log enviada agendar_periodo", X0 + COL_W * 2, y, `={{ ${JSON.stringify(txt)} }}`);
  connect("Switch", s.name, ROTA_OUT['agendar_periodo'], 0);
  connect(s.name, e.name);
  connect(e.name, l.name);
}

// ---- BRANCH: agendar_confirma (resumo + confirma) ----
{
  const y = Y0 + 4 * ROW_H;
  const s = salvaEstado("Salva agendar_confirma", X0, y, "agendar_confirma", "={{ JSON.stringify($json.contexto || {}) }}");
  const e = enviaMsg("Envia agendar_confirma", X0 + COL_W, y,
    "={{ '✅ *Confirmando seu agendamento:*\\n\\n📋 *Procedimento:* ' + ($json.contexto.procedimento || '') + '\\n📅 *Dia:* ' + ($json.contexto.dia || '') + '\\n⏰ *Período:* ' + ($json.contexto.periodo || '') + '\\n\\nEstá correto?\\n\\n1️⃣ Sim, confirmar!\\n2️⃣ Não, quero alterar' }}"
  );
  const l = logEnviada("Log enviada agendar_confirma", X0 + COL_W * 2, y,
    "={{ '✅ Confirmando seu agendamento: Procedimento: ' + ($json.contexto.procedimento || '') + ' | Dia: ' + ($json.contexto.dia || '') + ' | Período: ' + ($json.contexto.periodo || '') }}"
  );
  connect("Switch", s.name, ROTA_OUT['agendar_confirma'], 0);
  connect(s.name, e.name);
  connect(e.name, l.name);
}

// ---- BRANCH: agendar_ok (terminal: insere solicitacao, notifica, confirma, volta menu) ----
{
  const y = Y0 + 5 * ROW_H;
  const s = salvaEstado("Salva agendar_ok", X0, y, "menu", "={{ JSON.stringify({}) }}");
  const ins = insereSolicitacao("Insere solicitacao agendamento", X0 + COL_W, y, "agendamento",
    "={{ 'Procedimento: ' + ($json.contexto.procedimento || '') + ' | Dia: ' + ($json.contexto.dia || '') + ' | Período: ' + ($json.contexto.periodo || '') }}"
  );
  const txtPaciente = `Perfeito! Suas preferências foram anotadas e nossa equipe entrará em contato para confirmar o melhor horário disponível 😊🦷

Enquanto isso, qualquer dúvida estamos por aqui! Digite *menu* para voltar ao início.`;
  const e = enviaMsg("Envia agendar_ok", X0 + COL_W * 2, y, txtPaciente);
  const l = logEnviada("Log enviada agendar_ok", X0 + COL_W * 3, y, `={{ ${JSON.stringify(txtPaciente)} }}`);
  const notif = notificaSecretaria("Notifica agendamento", X0 + COL_W * 2, y + 140,
    "={{ '🦷 *NOVO AGENDAMENTO*\\n\\n👤 *Paciente:* ' + $('Coleta').item.json.nome + '\\n📱 WhatsApp: https://wa.me/' + $('Coleta').item.json.telefone.replace('@s.whatsapp.net','') + '\\n📋 *Procedimento:* ' + ($json.contexto.procedimento || '') + '\\n📅 *Dia:* ' + ($json.contexto.dia || '') + '\\n⏰ *Período:* ' + ($json.contexto.periodo || '') + '\\n\\n✅ Entre em contato para confirmar o horário!' }}"
  );
  connect("Switch", s.name, ROTA_OUT['agendar_ok'], 0);
  connect(s.name, ins.name);
  connect(ins.name, e.name);
  connect(ins.name, notif.name);
  connect(e.name, l.name);
}

// ---- BRANCH: procedimentos (menu odonto/estetica) ----
{
  const y = Y0 + 6 * ROW_H;
  const txt = `*🦷✨ Procedimentos e Tratamentos*

Escolha a categoria:

1️⃣ Odontologia
2️⃣ Estética e Harmonização Facial

0️⃣ Voltar ao menu`;
  const s = salvaEstado("Salva procedimentos", X0, y, "procedimentos", "={{ JSON.stringify({}) }}");
  const e = enviaMsg("Envia procedimentos", X0 + COL_W, y, txt);
  const l = logEnviada("Log enviada procedimentos", X0 + COL_W * 2, y, `={{ ${JSON.stringify(txt)} }}`);
  connect("Switch", s.name, ROTA_OUT['procedimentos'], 0);
  connect(s.name, e.name);
  connect(e.name, l.name);
}

// ---- BRANCH: proc_odonto ----
{
  const y = Y0 + 7 * ROW_H;
  const s = salvaEstado("Salva proc_odonto", X0, y, "proc_odonto", "={{ JSON.stringify({}) }}");
  const e = enviaMsg("Envia proc_odonto", X0 + COL_W, y, PROC_ODONTO_TEXT);
  const l = logEnviada("Log enviada proc_odonto", X0 + COL_W * 2, y, `={{ ${JSON.stringify(PROC_ODONTO_TEXT)} }}`);
  connect("Switch", s.name, ROTA_OUT['proc_odonto'], 0);
  connect(s.name, e.name);
  connect(e.name, l.name);
}

// ---- BRANCH: proc_estetica ----
{
  const y = Y0 + 8 * ROW_H;
  const s = salvaEstado("Salva proc_estetica", X0, y, "proc_estetica", "={{ JSON.stringify({}) }}");
  const e = enviaMsg("Envia proc_estetica", X0 + COL_W, y, PROC_ESTETICA_TEXT);
  const l = logEnviada("Log enviada proc_estetica", X0 + COL_W * 2, y, `={{ ${JSON.stringify(PROC_ESTETICA_TEXT)} }}`);
  connect("Switch", s.name, ROTA_OUT['proc_estetica'], 0);
  connect(s.name, e.name);
  connect(e.name, l.name);
}

// ---- BRANCH: valores ----
{
  const y = Y0 + 9 * ROW_H;
  const s = salvaEstado("Salva valores", X0, y, "valores", "={{ JSON.stringify({}) }}");
  const e = enviaMsg("Envia valores", X0 + COL_W, y, VALORES_TEXT);
  const l = logEnviada("Log enviada valores", X0 + COL_W * 2, y, `={{ ${JSON.stringify(VALORES_TEXT)} }}`);
  connect("Switch", s.name, ROTA_OUT['valores'], 0);
  connect(s.name, e.name);
  connect(e.name, l.name);
}

// ---- BRANCH: localizacao ----
{
  const y = Y0 + 10 * ROW_H;
  const s = salvaEstado("Salva localizacao", X0, y, "localizacao", "={{ JSON.stringify({}) }}");
  const e = enviaMsg("Envia localizacao", X0 + COL_W, y, LOCALIZACAO_TEXT);
  const l = logEnviada("Log enviada localizacao", X0 + COL_W * 2, y, `={{ ${JSON.stringify(LOCALIZACAO_TEXT)} }}`);
  connect("Switch", s.name, ROTA_OUT['localizacao'], 0);
  connect(s.name, e.name);
  connect(e.name, l.name);
}

// ---- BRANCH: urgencia (terminal-ish: insere solicitacao + notifica imediatamente, stays in urgencia state) ----
{
  const y = Y0 + 11 * ROW_H;
  const s = salvaEstado("Salva urgencia", X0, y, "urgencia", "={{ JSON.stringify({}) }}");
  const ins = insereSolicitacao("Insere solicitacao urgencia", X0 + COL_W, y, "urgencia",
    "={{ 'Paciente relatou situação de urgência/emergência via chatbot. Mensagem: ' + ($('Coleta').item.json.mensagem || '') }}"
  );
  const e = enviaMsg("Envia urgencia", X0 + COL_W * 2, y, URGENCIA_TEXT);
  const l = logEnviada("Log enviada urgencia", X0 + COL_W * 3, y, `={{ ${JSON.stringify(URGENCIA_TEXT)} }}`);
  const notif = notificaSecretaria("Notifica urgencia", X0 + COL_W * 2, y + 140,
    "={{ '🚨 *URGÊNCIA / EMERGÊNCIA*\\n\\n👤 *Paciente:* ' + $('Coleta').item.json.nome + '\\n📱 WhatsApp: https://wa.me/' + $('Coleta').item.json.telefone.replace('@s.whatsapp.net','') + '\\n\\n⚠️ Entre em contato imediatamente!' }}"
  );
  connect("Switch", s.name, ROTA_OUT['urgencia'], 0);
  connect(s.name, ins.name);
  connect(ins.name, e.name);
  connect(ins.name, notif.name);
  connect(e.name, l.name);
}

// ---- BRANCH: reagendar (prompt for motivo) ----
{
  const y = Y0 + 12 * ROW_H;
  const txt = `Sem problemas! 😊 Me conta rapidinho o que você gostaria de mudar
_(consulta, dia, procedimento, ou se prefere cancelar)_...

✳️ *Voltar ao menu* -> digite *menu*`;
  const s = salvaEstado("Salva reagendar", X0, y, "reagendar", "={{ JSON.stringify({}) }}");
  const e = enviaMsg("Envia reagendar", X0 + COL_W, y, txt);
  const l = logEnviada("Log enviada reagendar", X0 + COL_W * 2, y, `={{ ${JSON.stringify(txt)} }}`);
  connect("Switch", s.name, ROTA_OUT['reagendar'], 0);
  connect(s.name, e.name);
  connect(e.name, l.name);
}

// ---- BRANCH: reagendar_ok (terminal: insere solicitacao tipo reagendamento/cancelamento) ----
{
  const y = Y0 + 13 * ROW_H;
  const s = salvaEstado("Salva reagendar_ok", X0, y, "menu", "={{ JSON.stringify({}) }}");
  const ins = insereSolicitacao("Insere solicitacao reagendar", X0 + COL_W, y,
    "={{ $json.contexto.tipoSolicitacao || 'reagendamento' }}",
    "={{ $json.contexto.pedido || '' }}"
  );
  const txtPaciente = `Entendido! 😊 Nossa equipe entrará em contato pelo WhatsApp para combinar o que for necessário.

Digite *menu* para voltar ao início.`;
  const e = enviaMsg("Envia reagendar_ok", X0 + COL_W * 2, y, txtPaciente);
  const l = logEnviada("Log enviada reagendar_ok", X0 + COL_W * 3, y, `={{ ${JSON.stringify(txtPaciente)} }}`);
  const notif = notificaSecretaria("Notifica reagendamento", X0 + COL_W * 2, y + 140,
    "={{ '📅 *REAGENDAMENTO / CANCELAMENTO*\\n\\n👤 *Paciente:* ' + $('Coleta').item.json.nome + '\\n📱 WhatsApp: https://wa.me/' + $('Coleta').item.json.telefone.replace('@s.whatsapp.net','') + '\\n🔄 *Tipo:* ' + ($json.contexto.tipoSolicitacao || 'reagendamento') + '\\n📝 *Detalhes:* ' + ($json.contexto.pedido || '') + '\\n\\n⚠️ Entre em contato com o paciente!' }}"
  );
  connect("Switch", s.name, ROTA_OUT['reagendar_ok'], 0);
  connect(s.name, ins.name);
  connect(ins.name, e.name);
  connect(ins.name, notif.name);
  connect(e.name, l.name);
}

// ---- BRANCH: secretaria (prompt for assunto) ----
{
  const y = Y0 + 14 * ROW_H;
  const txt = `Claro! 😊 Sobre o que você gostaria de falar com a secretária?

✳️ *Voltar ao menu* -> digite *menu*`;
  const s = salvaEstado("Salva secretaria", X0, y, "secretaria", "={{ JSON.stringify({}) }}");
  const e = enviaMsg("Envia secretaria", X0 + COL_W, y, txt);
  const l = logEnviada("Log enviada secretaria", X0 + COL_W * 2, y, `={{ ${JSON.stringify(txt)} }}`);
  connect("Switch", s.name, ROTA_OUT['secretaria'], 0);
  connect(s.name, e.name);
  connect(e.name, l.name);
}

// ---- BRANCH: secretaria_ok (terminal: insere solicitacao tipo secretaria) ----
{
  const y = Y0 + 15 * ROW_H;
  const s = salvaEstado("Salva secretaria_ok", X0, y, "menu", "={{ JSON.stringify({}) }}");
  const ins = insereSolicitacao("Insere solicitacao secretaria", X0 + COL_W, y, "secretaria",
    "={{ $json.contexto.assunto || '' }}"
  );
  const txtPaciente = `Certo! Já avisei nossa equipe e em breve alguém vai te chamar aqui no WhatsApp 😊

Digite *menu* para voltar ao início.`;
  const e = enviaMsg("Envia secretaria_ok", X0 + COL_W * 2, y, txtPaciente);
  const l = logEnviada("Log enviada secretaria_ok", X0 + COL_W * 3, y, `={{ ${JSON.stringify(txtPaciente)} }}`);
  const notif = notificaSecretaria("Notifica secretaria", X0 + COL_W * 2, y + 140,
    "={{ '💬 *CONTATO SOLICITADO*\\n\\n👤 *Paciente:* ' + $('Coleta').item.json.nome + '\\n📱 WhatsApp: https://wa.me/' + $('Coleta').item.json.telefone.replace('@s.whatsapp.net','') + '\\n📝 *Assunto:* ' + ($json.contexto.assunto || '') + '\\n\\n📞 O paciente quer falar com a secretária!' }}"
  );
  connect("Switch", s.name, ROTA_OUT['secretaria_ok'], 0);
  connect(s.name, ins.name);
  connect(ins.name, e.name);
  connect(ins.name, notif.name);
  connect(e.name, l.name);
}

// ---- BRANCH: invalido ----
{
  const y = Y0 + 16 * ROW_H;
  const s = salvaEstado("Salva invalido", X0, y, "={{ $json.estado === 'menu' || !$json.estado ? 'menu' : $json.estado }}", "={{ JSON.stringify($json.contexto || {}) }}");
  const e = enviaMsg("Envia invalido", X0 + COL_W, y, INVALIDO_TEXT);
  const l = logEnviada("Log enviada invalido", X0 + COL_W * 2, y, `={{ ${JSON.stringify(INVALIDO_TEXT)} }}`);
  connect("Switch", s.name, ROTA_OUT['invalido'], 0);
  connect(s.name, e.name);
  connect(e.name, l.name);
}

// =========================================================
// Sticky note
// =========================================================
addNode({
  id: nid(), name: "Bot Menu - Cloudy - Sao Joao Odontologia (Nota)", type: "n8n-nodes-base.stickyNote", typeVersion: 1,
  position: [BASE_X, BASE_Y - 220],
  parameters: {
    content: `## Bot Menu - Cloudy - Sao Joao Odontologia\n\nFluxo 100% automatico com menu numerico (1-7).\n\nComandos da secretaria (mensagem enviada pelo proprio numero - fromMe):\n- 'pausar' -> pausa o bot para aquele telefone\n- 'retomar' -> retoma o bot para aquele telefone\n\nPaciente pode digitar 'menu' a qualquer momento para voltar ao inicio.\n\nCREDENCIAIS: configurar Supabase_SaoJoao_Postgres (senha do banco) e WhatsAppTesteBot (server-url + apikey) antes de ativar.`,
    height: 200,
    width: 700,
    color: 3
  }
});

// =========================================================
// OUTPUT
// =========================================================
const workflow = {
  name: "Bot Menu - Cloudy - Sao Joao Odontologia",
  nodes,
  connections,
  settings: { executionOrder: "v1" }
};

fs.writeFileSync(__dirname + '/workflow-bot-cloudy.json', JSON.stringify(workflow, null, 2));
console.log("Generated", nodes.length, "nodes");
