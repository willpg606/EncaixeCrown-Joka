import cors from 'cors';
import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import XLSX from 'xlsx';
import { createDatabase } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const storageDir = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR)
  : path.join(__dirname, 'storage');
const uploadsDir = path.join(storageDir, 'uploads');
const baseCachePath = path.join(storageDir, 'base-cache.json');
const historyPath = path.join(storageDir, 'history.json');
const settingsPath = path.join(storageDir, 'settings.json');

fs.mkdirSync(uploadsDir, { recursive: true });

const app = express();
const port = Number(process.env.PORT || 3333);

app.use(cors());
app.use(express.json({ limit: '4mb' }));

const upload = multer({
  dest: uploadsDir,
  fileFilter: (_, file, cb) => {
    if (file.originalname.toLowerCase().endsWith('.xlsx')) {
      cb(null, true);
      return;
    }

    cb(new Error('Envie um arquivo .xlsx válido.'));
  }
});

const turnosValidos = new Set(['A', 'B', 'C', 'D', 'ADM']);
const colunasBase = {
  id: ['ID', 'Id', 'id'],
  rota: ['ROTA', 'Rota'],
  horarioEmbarque: ['HORÁRIO EMBARQUE', 'HORARIO EMBARQUE', 'HORÁRIO DE EMBARQUE', 'HORARIO DE EMBARQUE', 'HORARIO_EMBARQUE'],
  pontoEmbarque: ['PONTO DE EMBARQUE', 'PONTO EMBARQUE', 'PONTO_EMBARQUE'],
  funcionario: ['FUNCIONÁRIO', 'FUNCIONARIO', 'Funcionario']
};
const validacaoBaseVazia = {
  missingColumns: [],
  duplicateIds: [],
  resumo: {
    totalLinhas: 0,
    totalValidas: 0,
    duplicados: 0,
    semId: 0,
    semRota: 0,
    semHorario: 0,
    semPonto: 0,
    semFuncionario: 0
  }
};
const solicitantesPadrao = [
  'Alan Nik',
  'Calandra Tilpe',
  'Cassio Simao',
  'Elcio Brandao',
  'Everton Juscinski',
  'Gabriela Dogado',
  'Gilmar Silva',
  'Isabella Harkatyn',
  'Jose Lucio',
  'Juan Miscione',
  'Karen Santos',
  'Ketelin Barbosa',
  'Lucas Borges',
  'Renato Martins',
  'Vinicius Souza'
];

const obterCampo = (row, aliases = []) => {
  for (const alias of aliases) {
    if (row[alias] !== undefined && row[alias] !== null && String(row[alias]).trim() !== '') {
      return row[alias];
    }
  }

  return '';
};

const normalizarNome = (nome = '') =>
  nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();

const limparNomeExibicao = (nome = '') =>
  String(nome)
    .replace(/\s*\(encaixe\)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

const gerarChave = (nome = '', turno = '') =>
  `${normalizarNome(nome)}${String(turno).trim().toUpperCase()}`;

const extrairNomeETurno = (id = '', funcionario = '') => {
  const idTexto = String(id || '').trim();
  const funcionarioTexto = String(funcionario || '').trim();
  const idNormalizado = normalizarNome(idTexto);
  const candidatosTurno = ['ADM', 'A', 'B', 'C', 'D'];

  for (const turno of candidatosTurno) {
    if (!idNormalizado.endsWith(turno)) {
      continue;
    }

    if (funcionarioTexto) {
      return { nome: limparNomeExibicao(funcionarioTexto), turno };
    }

    return {
      nome: idTexto.slice(0, Math.max(0, idTexto.length - turno.length)).trim() || idTexto,
      turno
    };
  }

  return {
    nome: limparNomeExibicao(funcionarioTexto || idTexto),
    turno: ''
  };
};

const formatarHorarioExcel = (valor) => {
  if (valor === null || valor === undefined || valor === '') {
    return '';
  }

  if (typeof valor === 'number' && Number.isFinite(valor)) {
    const totalMinutos = Math.round(valor * 24 * 60);
    const horas = String(Math.floor(totalMinutos / 60) % 24).padStart(2, '0');
    const minutos = String(totalMinutos % 60).padStart(2, '0');
    return `${horas}:${minutos}`;
  }

  const texto = String(valor).trim();
  const match = texto.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);

  if (match) {
    const [, horas, minutos] = match;
    return `${horas.padStart(2, '0')}:${minutos}`;
  }

  const numero = Number(texto.replace(',', '.'));

  if (!Number.isNaN(numero) && texto.includes('.')) {
    const totalMinutos = Math.round(numero * 24 * 60);
    const horas = String(Math.floor(totalMinutos / 60) % 24).padStart(2, '0');
    const minutos = String(totalMinutos % 60).padStart(2, '0');
    return `${horas}:${minutos}`;
  }

  return texto;
};

const horarioParaMinutos = (valor = '') => {
  const texto = formatarHorarioExcel(valor);
  const match = texto.match(/^(\d{2}):(\d{2})$/);

  if (!match) {
    return Number.MAX_SAFE_INTEGER;
  }

  return Number(match[1]) * 60 + Number(match[2]);
};

const rotaParaOrdem = (valor = '') => {
  const texto = String(valor).trim();
  const numero = Number(texto);

  if (!Number.isNaN(numero)) {
    return numero;
  }

  return Number.MAX_SAFE_INTEGER;
};

const turnoParaOrdem = (valor = '') => {
  const ordem = ['A', 'B', 'C', 'D', 'ADM'];
  const indice = ordem.indexOf(String(valor).trim().toUpperCase());

  return indice === -1 ? Number.MAX_SAFE_INTEGER : indice;
};

const normalizarData = (valor = '') => {
  const texto = String(valor).trim();

  if (!texto) {
    return '';
  }

  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (iso) {
    return `${iso[1]}-${iso[2]}-${iso[3]}`;
  }

  const br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (br) {
    return `${br[3]}-${br[2]}-${br[1]}`;
  }

  return '';
};

const parseLinhaLote = (linha = '', dataPadrao = '') => {
  const colunas = linha.split('\t').map((item) => item.trim());

  if (colunas.length >= 4) {
    const dataLinha = normalizarData(colunas[0]) || dataPadrao;
    const nome = colunas[1] || '';
    const turno = String(colunas[3] || '').trim().toUpperCase();

    return { dataEncaixe: dataLinha, nome, turno };
  }

  const pipeParts = linha.split('|').map((item) => item.trim()).filter(Boolean);
  const temDataNoInicio = pipeParts.length >= 2 && normalizarData(pipeParts[0]);

  if (temDataNoInicio) {
    const dataLinha = normalizarData(pipeParts.shift());
    const restante = pipeParts.join(' | ');
    const partes = restante.split(/\s*-\s*/);
    const turno = partes.pop()?.trim().toUpperCase() || '';
    const nome = partes.join(' - ').trim();

    return { dataEncaixe: dataLinha, nome, turno };
  }

  const partes = linha.split(/\s*-\s*/);
  const turno = partes.pop()?.trim().toUpperCase() || '';
  const nome = partes.join(' - ').trim();

  return {
    dataEncaixe: dataPadrao,
    nome,
    turno
  };
};

const parseInput = (rawInput = '', dataPadrao = '') => {
  const linhas = rawInput
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter(Boolean);

  return linhas.map((linha, index) => {
    const { dataEncaixe, nome, turno } = parseLinhaLote(linha, dataPadrao);
    const formatoValido = Boolean(nome) && Boolean(turno);
    const turnoValido = turnosValidos.has(turno);
    const dataValida = Boolean(dataEncaixe);

    return {
      linha: index + 1,
      original: linha,
      dataEncaixe,
      nome,
      turno,
      chave: formatoValido ? gerarChave(nome, turno) : '',
      valido: formatoValido && turnoValido && dataValida,
      erro: !formatoValido
        ? 'Formato inválido. Use Nome - Turno.'
        : !turnoValido
          ? 'Turno inválido. Use A, B, C, D ou ADM.'
          : !dataValida
            ? 'Data inválida. Use dd/mm/aaaa na linha ou a data padrão no topo.'
          : ''
    };
  });
};

const defaultSettings = {
  solicitantes: solicitantesPadrao,
  outlook: {
    enabled: false,
    tenantId: '',
    clientId: '',
    clientSecret: '',
    mailbox: '',
    folder: 'Caixa de Entrada',
    subjectFilter: 'Encaixe',
    senderFilter: '',
    extractMode: 'body',
    markAsProcessed: false,
    lastValidatedAt: null
  }
};

const criarIndiceBase = (rows = []) => {
  const index = new Map();

  rows.forEach((row) => {
    index.set(row.id, row);
  });

  return index;
};

const database = createDatabase({
  storageDir,
  baseCachePath,
  historyPath,
  settingsPath,
  validacaoBaseVazia,
  defaultSettings
});

let baseAtual = database.loadBase();
let baseIndex = criarIndiceBase(baseAtual.rows);
let historico = database.loadHistory();
let configuracoes = database.loadSettings();

const buscarNaBase = (chave) => {
  const item = baseIndex.get(chave);

  if (!item) {
    return null;
  }

  return {
    rota: item.rota || 'NÃO ENCONTRADO',
    horarioEmbarque: item.horarioEmbarque || 'NÃO ENCONTRADO',
    pontoEmbarque: item.pontoEmbarque || 'NÃO ENCONTRADO',
    colaboradorBase: item.funcionario || item.nomeOriginal || 'NÃO ENCONTRADO'
  };
};

const gerarResultado = ({ solicitante, registros }) =>
  registros.map((registro) => {
    if (!registro.valido) {
      return {
        id: uuidv4(),
        status: 'erro',
        dataEncaixe: registro.dataEncaixe || '',
        colaborador: registro.nome || registro.original,
        turnoEncaixe: registro.turno || '-',
        horarioEmbarque: 'NÃO ENCONTRADO',
        pontoEmbarque: registro.erro,
        rota: 'NÃO ENCONTRADO',
        solicitante
      };
    }

    const encontrado = buscarNaBase(registro.chave);

    if (!encontrado) {
      return {
        id: uuidv4(),
        status: 'erro',
        dataEncaixe: registro.dataEncaixe,
        colaborador: registro.nome,
        turnoEncaixe: registro.turno,
        horarioEmbarque: 'NÃO ENCONTRADO',
        pontoEmbarque: 'NÃO ENCONTRADO',
        rota: 'NÃO ENCONTRADO',
        solicitante
      };
    }

    return {
      id: uuidv4(),
      status: 'ok',
      dataEncaixe: registro.dataEncaixe,
      colaborador: registro.nome,
      turnoEncaixe: registro.turno,
      horarioEmbarque: encontrado.horarioEmbarque,
      pontoEmbarque: encontrado.pontoEmbarque,
      rota: encontrado.rota,
      solicitante
    };
  });

const montarRawInputDosResultados = (resultados = []) =>
  resultados
    .map((item) => `${item.dataEncaixe ? item.dataEncaixe.split('-').reverse().join('/') + ' | ' : ''}${item.colaborador} - ${item.turnoEncaixe}`)
    .join('\n');

const criarResumoEncaixe = ({ id = uuidv4(), createdAt = new Date().toISOString(), solicitante, dataEncaixe, rawInput }) => {
  const dataPadrao = normalizarData(dataEncaixe);
  const registros = parseInput(rawInput, dataPadrao);
  const resultados = gerarResultado({
    solicitante: solicitante.trim(),
    registros
  });
  resultados.sort((a, b) => {
    const turnoDiff = turnoParaOrdem(a.turnoEncaixe) - turnoParaOrdem(b.turnoEncaixe);

    if (turnoDiff !== 0) {
      return turnoDiff;
    }

    const rotaDiff = rotaParaOrdem(a.rota) - rotaParaOrdem(b.rota);

    if (rotaDiff !== 0) {
      return rotaDiff;
    }

    const horarioDiff = horarioParaMinutos(a.horarioEmbarque) - horarioParaMinutos(b.horarioEmbarque);

    if (horarioDiff !== 0) {
      return horarioDiff;
    }

    return a.colaborador.localeCompare(b.colaborador, 'pt-BR');
  });
  const datasUnicas = [...new Set(resultados.map((item) => item.dataEncaixe).filter(Boolean))];

  return {
    id,
    createdAt,
    solicitante: solicitante.trim(),
    dataEncaixe: datasUnicas.length === 1 ? datasUnicas[0] : '',
    datasEncaixe: datasUnicas,
    dataPadrao,
    rawInput,
    totalProcessados: resultados.length,
    totalErros: resultados.filter((item) => item.status === 'erro').length,
    resultados
  };
};

const listarSolicitantes = () =>
  [...new Set((configuracoes.solicitantes || []).map((item) => String(item || '').trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));

const obterOutlookConfig = () => ({
  enabled: Boolean(configuracoes.outlook?.enabled),
  tenantId: String(configuracoes.outlook?.tenantId || ''),
  clientId: String(configuracoes.outlook?.clientId || ''),
  clientSecret: String(configuracoes.outlook?.clientSecret || ''),
  mailbox: String(configuracoes.outlook?.mailbox || ''),
  folder: String(configuracoes.outlook?.folder || 'Caixa de Entrada'),
  subjectFilter: String(configuracoes.outlook?.subjectFilter || 'Encaixe'),
  senderFilter: String(configuracoes.outlook?.senderFilter || ''),
  extractMode: String(configuracoes.outlook?.extractMode || 'body'),
  markAsProcessed: Boolean(configuracoes.outlook?.markAsProcessed),
  lastValidatedAt: configuracoes.outlook?.lastValidatedAt || null
});

const resumirOutlookConfig = () => {
  const config = obterOutlookConfig();

  return {
    ...config,
    clientSecretConfigured: Boolean(config.clientSecret),
    readyToConnect: Boolean(config.tenantId && config.clientId && config.clientSecret && config.mailbox),
    pendingItems: [
      !config.tenantId && 'ID do locatário',
      !config.clientId && 'ID do aplicativo',
      !config.clientSecret && 'Segredo do aplicativo',
      !config.mailbox && 'Caixa de e-mail'
    ].filter(Boolean)
  };
};

const obterInconsistenciasBase = () => {
  const validation = baseAtual.validation || validacaoBaseVazia;
  const faltas = {
    semRota: [],
    semHorario: [],
    semPonto: [],
    semFuncionario: [],
    semTurno: []
  };

  baseAtual.rows.forEach((row) => {
    const itemBase = {
      id: row.id,
      colaborador: row.nomeExibicao || row.funcionario || row.nomeOriginal || 'NÃO INFORMADO',
      turno: row.turno || '-'
    };

    if (!row.rota) {
      faltas.semRota.push(itemBase);
    }

    if (!row.horarioEmbarque) {
      faltas.semHorario.push(itemBase);
    }

    if (!row.pontoEmbarque) {
      faltas.semPonto.push(itemBase);
    }

    if (!row.funcionario) {
      faltas.semFuncionario.push(itemBase);
    }

    if (!row.turno) {
      faltas.semTurno.push(itemBase);
    }
  });

  return {
    arquivo: baseAtual.fileName || '',
    importedAt: baseAtual.importedAt,
    validation,
    faltas,
    resumo: {
      ...validation.resumo,
      semTurno: faltas.semTurno.length
    }
  };
};

const obterInconsistenciasHistorico = () => {
  const lotes = historico.map((item) => ({
    ...item,
    rawInput: item.rawInput || montarRawInputDosResultados(item.resultados)
  }));

  const naoEncontrados = lotes.flatMap((lote) =>
    (lote.resultados || [])
      .filter(
        (resultado) =>
          resultado.status === 'erro' ||
          resultado.rota === 'NÃO ENCONTRADO' ||
          resultado.horarioEmbarque === 'NÃO ENCONTRADO' ||
          resultado.pontoEmbarque === 'NÃO ENCONTRADO'
      )
      .map((resultado) => ({
        loteId: lote.id,
        criadoEm: lote.createdAt,
        dataEncaixe: resultado.dataEncaixe,
        colaborador: resultado.colaborador,
        turnoEncaixe: resultado.turnoEncaixe,
        horarioEmbarque: resultado.horarioEmbarque,
        pontoEmbarque: resultado.pontoEmbarque,
        rota: resultado.rota,
        solicitante: resultado.solicitante,
        status: resultado.status
      }))
  );

  naoEncontrados.sort((a, b) => {
    const dataA = a.dataEncaixe || '';
    const dataB = b.dataEncaixe || '';

    if (dataA !== dataB) {
      return dataB.localeCompare(dataA);
    }

    return a.colaborador.localeCompare(b.colaborador, 'pt-BR');
  });

  return {
    totalLotes: lotes.length,
    totalNaoEncontrados: naoEncontrados.length,
    naoEncontrados
  };
};

const criarResumoDoDia = (resultados = []) => {
  const porTurnoMap = new Map();
  const porRotaMap = new Map();
  const porSolicitanteMap = new Map();

  resultados.forEach((item) => {
    const turno = item.turnoEncaixe || '-';
    const rota = item.rota || 'NÃO ENCONTRADO';
    const solicitante = item.solicitante || 'NÃO INFORMADO';

    porTurnoMap.set(turno, (porTurnoMap.get(turno) || 0) + 1);
    porRotaMap.set(rota, (porRotaMap.get(rota) || 0) + 1);
    porSolicitanteMap.set(solicitante, (porSolicitanteMap.get(solicitante) || 0) + 1);
  });

  const ordenarLista = (entries, tipo = 'texto') =>
    [...entries]
      .sort((a, b) => {
        if (tipo === 'turno') {
          const turnoDiff = turnoParaOrdem(a[0]) - turnoParaOrdem(b[0]);

          if (turnoDiff !== 0) {
            return turnoDiff;
          }
        }

        if (tipo === 'rota') {
          const rotaDiff = rotaParaOrdem(a[0]) - rotaParaOrdem(b[0]);

          if (rotaDiff !== 0) {
            return rotaDiff;
          }
        }

        if (b[1] !== a[1]) {
          return b[1] - a[1];
        }

        return String(a[0]).localeCompare(String(b[0]), 'pt-BR');
      })
      .map(([chave, total]) => ({ chave, total }));

  return {
    totalOk: resultados.filter((item) => item.status === 'ok').length,
    totalErros: resultados.filter((item) => item.status === 'erro').length,
    porTurno: ordenarLista(porTurnoMap.entries(), 'turno'),
    porRota: ordenarLista(porRotaMap.entries(), 'rota'),
    porSolicitante: ordenarLista(porSolicitanteMap.entries())
  };
};

app.use(express.static(path.join(rootDir, 'dist')));

app.get('/api/health', (_, res) => {
  res.json({ ok: true });
});

app.get('/api/base/status', (_, res) => {
  res.json({
    totalRegistros: baseAtual.rows.length,
    importedAt: baseAtual.importedAt,
    fileName: baseAtual.fileName,
    validation: baseAtual.validation || validacaoBaseVazia,
    storage: {
      type: 'sqlite',
      path: database.dbPath
    }
  });
});

app.get('/api/solicitantes', (_, res) => {
  res.json({
    solicitantes: listarSolicitantes()
  });
});

app.get('/api/outlook/config', (_, res) => {
  res.json({
    outlook: resumirOutlookConfig()
  });
});

app.put('/api/outlook/config', (req, res) => {
  const body = req.body || {};

  configuracoes = {
    ...configuracoes,
    outlook: {
      ...obterOutlookConfig(),
      enabled: Boolean(body.enabled),
      tenantId: String(body.tenantId || '').trim(),
      clientId: String(body.clientId || '').trim(),
      clientSecret: String(body.clientSecret || '').trim(),
      mailbox: String(body.mailbox || '').trim(),
      folder: String(body.folder || 'Caixa de Entrada').trim() || 'Caixa de Entrada',
      subjectFilter: String(body.subjectFilter || '').trim(),
      senderFilter: String(body.senderFilter || '').trim(),
      extractMode: String(body.extractMode || 'body').trim() || 'body',
      markAsProcessed: Boolean(body.markAsProcessed)
    }
  };

  database.saveSettings(configuracoes);

  res.json({
    message: 'Estrutura do Outlook salva com sucesso.',
    outlook: resumirOutlookConfig()
  });
});

app.post('/api/outlook/validate', (_, res) => {
  const config = resumirOutlookConfig();

  if (!config.readyToConnect) {
    res.status(400).json({
      message: `Integração ainda não pronta. Complete: ${config.pendingItems.join(', ')}.`,
      outlook: config
    });
    return;
  }

  configuracoes = {
    ...configuracoes,
    outlook: {
      ...obterOutlookConfig(),
      lastValidatedAt: new Date().toISOString()
    }
  };
  database.saveSettings(configuracoes);

  res.json({
    message: 'Estrutura pronta para conexão com Microsoft Graph. Falta apenas ativar as credenciais reais no ambiente.',
    outlook: resumirOutlookConfig(),
    nextStep: 'Registrar o aplicativo no Azure e conectar a autenticação Microsoft 365.'
  });
});

app.post('/api/solicitantes', (req, res) => {
  const nome = String(req.body?.nome || '').trim().replace(/\s+/g, ' ');

  if (!nome) {
    res.status(400).json({ message: 'Informe um nome válido para cadastrar.' });
    return;
  }

  const existe = listarSolicitantes().some((item) => normalizarNome(item) === normalizarNome(nome));

  if (existe) {
    res.status(400).json({ message: 'Este solicitante já está cadastrado.' });
    return;
  }

  configuracoes = {
    ...configuracoes,
    solicitantes: [...listarSolicitantes(), nome]
  };
  database.saveSettings(configuracoes);

  res.json({
    message: 'Solicitante cadastrado com sucesso.',
    solicitantes: listarSolicitantes()
  });
});

app.put('/api/solicitantes/:nome', (req, res) => {
  const nomeAtual = String(req.params.nome || '').trim();
  const novoNome = String(req.body?.nome || '').trim().replace(/\s+/g, ' ');

  if (!nomeAtual || !novoNome) {
    res.status(400).json({ message: 'Informe o solicitante atual e o novo nome.' });
    return;
  }

  const lista = listarSolicitantes();
  const indice = lista.findIndex((item) => normalizarNome(item) === normalizarNome(nomeAtual));

  if (indice === -1) {
    res.status(404).json({ message: 'Solicitante não encontrado.' });
    return;
  }

  const duplicado = lista.some(
    (item, itemIndice) => itemIndice !== indice && normalizarNome(item) === normalizarNome(novoNome)
  );

  if (duplicado) {
    res.status(400).json({ message: 'Já existe outro solicitante com este nome.' });
    return;
  }

  lista[indice] = novoNome;
  configuracoes = {
    ...configuracoes,
    solicitantes: lista
  };
  database.saveSettings(configuracoes);

  res.json({
    message: 'Solicitante atualizado com sucesso.',
    solicitantes: listarSolicitantes()
  });
});

app.delete('/api/solicitantes/:nome', (req, res) => {
  const nome = String(req.params.nome || '').trim();
  const listaAtual = listarSolicitantes();
  const listaFiltrada = listaAtual.filter((item) => normalizarNome(item) !== normalizarNome(nome));

  if (listaFiltrada.length === listaAtual.length) {
    res.status(404).json({ message: 'Solicitante não encontrado.' });
    return;
  }

  configuracoes = {
    ...configuracoes,
    solicitantes: listaFiltrada
  };
  database.saveSettings(configuracoes);

  res.json({
    message: 'Solicitante removido com sucesso.',
    solicitantes: listarSolicitantes()
  });
});

app.get('/api/inconsistencias', (_, res) => {
  const base = obterInconsistenciasBase();
  const historicoInconsistente = obterInconsistenciasHistorico();

  res.json({
    base,
    historico: historicoInconsistente,
    resumo: {
      duplicados: base.validation?.resumo?.duplicados || 0,
      colunasAusentes: base.validation?.missingColumns?.length || 0,
      semRota: base.resumo?.semRota || 0,
      semHorario: base.resumo?.semHorario || 0,
      semPonto: base.resumo?.semPonto || 0,
      semFuncionario: base.resumo?.semFuncionario || 0,
      semTurno: base.resumo?.semTurno || 0,
      naoEncontrados: historicoInconsistente.totalNaoEncontrados
    }
  });
});

app.get('/api/base/search', (req, res) => {
  const query = String(req.query.q || '').trim();

  if (!query) {
    res.json([]);
    return;
  }

  const termos = normalizarNome(query)
    .split(' ')
    .map((item) => item.trim())
    .filter(Boolean);
  const vistos = new Set();
  const resultados = [];

  for (const row of baseAtual.rows) {
    const colaborador = row.turno || row.nomeExibicao
      ? {
          nome: row.nomeExibicao || row.funcionario || row.nomeOriginal || '',
          turno: row.turno || ''
        }
      : extrairNomeETurno(row.id || row.nomeOriginal || '', row.funcionario || '');
    const alvo = row.nomeBusca || normalizarNome(colaborador.nome || row.funcionario || row.nomeOriginal || '');
    const corresponde = termos.every((termo) => alvo.includes(termo));

    if (!corresponde) {
      continue;
    }

    const nomeLimpo = limparNomeExibicao(colaborador.nome || row.funcionario || row.nomeOriginal);
    const chaveLista = normalizarNome(nomeLimpo);

    if (vistos.has(chaveLista)) {
      continue;
    }

    vistos.add(chaveLista);
    resultados.push({
      id: row.id,
      nome: nomeLimpo,
      turno: colaborador.turno || '',
      rota: row.rota || '',
      horarioEmbarque: formatarHorarioExcel(row.horarioEmbarque || ''),
      pontoEmbarque: row.pontoEmbarque || ''
    });

    if (resultados.length >= 12) {
      break;
    }
  }

  res.json(resultados);
});

app.post('/api/base/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ message: 'Arquivo não enviado.' });
    return;
  }

  try {
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    const headers = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, blankrows: false })[0] || [];
    const missingColumns = Object.entries(colunasBase)
      .filter(([, aliases]) => !aliases.some((alias) => headers.includes(alias)))
      .map(([key]) => key);

    if (missingColumns.length > 0) {
      throw new Error(`Colunas obrigatórias ausentes: ${missingColumns.join(', ')}.`);
    }

    if (rows.length === 0) {
      throw new Error('A planilha está vazia ou sem linhas de dados.');
    }

    const duplicateIds = [];
    const idsVistos = new Set();
    const resumo = {
      totalLinhas: rows.length,
      totalValidas: 0,
      duplicados: 0,
      semId: 0,
      semRota: 0,
      semHorario: 0,
      semPonto: 0,
      semFuncionario: 0
    };

    const normalizados = rows.map((row, index) => {
      const idOriginal = obterCampo(row, colunasBase.id);
      const funcionario = obterCampo(row, colunasBase.funcionario);
      const colaborador = extrairNomeETurno(idOriginal, funcionario);
      const idNormalizado = normalizarNome(String(idOriginal));
      const rota = String(obterCampo(row, colunasBase.rota)).trim();
      const horarioEmbarque = formatarHorarioExcel(obterCampo(row, colunasBase.horarioEmbarque));
      const pontoEmbarque = String(obterCampo(row, colunasBase.pontoEmbarque)).trim();

      if (!idNormalizado) {
        resumo.semId += 1;
      }
      if (!rota) {
        resumo.semRota += 1;
      }
      if (!horarioEmbarque) {
        resumo.semHorario += 1;
      }
      if (!pontoEmbarque) {
        resumo.semPonto += 1;
      }
      if (!String(funcionario).trim()) {
        resumo.semFuncionario += 1;
      }

      if (idNormalizado) {
        if (idsVistos.has(idNormalizado)) {
          resumo.duplicados += 1;
          duplicateIds.push({
            linha: index + 2,
            id: idNormalizado,
            funcionario: limparNomeExibicao(funcionario || idOriginal)
          });
        } else {
          idsVistos.add(idNormalizado);
          resumo.totalValidas += 1;
        }
      }

      return {
        id: idNormalizado,
        rota,
        horarioEmbarque,
        pontoEmbarque,
        funcionario: String(funcionario).trim(),
        nomeBusca: normalizarNome(limparNomeExibicao(colaborador.nome)),
        nomeExibicao: limparNomeExibicao(colaborador.nome),
        turno: colaborador.turno,
        nomeOriginal: String(funcionario || idOriginal).trim()
      };
    });

    const rowsUnicas = [];
    const idsBase = new Set();

    normalizados.forEach((item) => {
      if (!item.id || idsBase.has(item.id)) {
        return;
      }

      idsBase.add(item.id);
      rowsUnicas.push(item);
    });

    baseAtual = {
      rows: rowsUnicas,
      importedAt: new Date().toISOString(),
      fileName: req.file.originalname,
      validation: {
        missingColumns,
        duplicateIds,
        resumo
      }
    };

    baseIndex = criarIndiceBase(baseAtual.rows);
    database.saveBase(baseAtual);
    fs.unlinkSync(req.file.path);

    res.json({
      message: 'Base importada com sucesso.',
      totalRegistros: baseAtual.rows.length,
      importedAt: baseAtual.importedAt,
      fileName: baseAtual.fileName,
      validation: baseAtual.validation
    });
  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ message: error.message || 'Erro ao importar base.' });
  }
});

app.post('/api/encaixes/process', (req, res) => {
  const { solicitante, dataEncaixe, rawInput } = req.body;

  if (!solicitante?.trim()) {
    res.status(400).json({ message: 'Solicitante é obrigatório.' });
    return;
  }

  if (!rawInput?.trim()) {
    res.status(400).json({ message: 'Cole pelo menos uma linha para processar.' });
    return;
  }

  const resumo = criarResumoEncaixe({
    solicitante,
    dataEncaixe,
    rawInput
  });

  historico = [resumo, ...historico].slice(0, 100);
  database.saveHistory(historico);

  res.json({
    ...resumo,
    totalOk: resumo.resultados.filter((item) => item.status === 'ok').length
  });
});

app.get('/api/history', (_, res) => {
  const historicoNormalizado = historico.map((item) => ({
    ...item,
    rawInput: item.rawInput || montarRawInputDosResultados(item.resultados)
  }));

  res.json(historicoNormalizado);
});

app.get('/api/busca', (req, res) => {
  const dataSolicitada = normalizarData(String(req.query.data || ''));
  const turnoSolicitado = String(req.query.turno || '').trim().toUpperCase();

  if (!dataSolicitada) {
    res.status(400).json({ message: 'Informe uma data válida para a busca.' });
    return;
  }

  const lotesRelacionados = historico
    .map((item) => ({
      ...item,
      rawInput: item.rawInput || montarRawInputDosResultados(item.resultados)
    }))
    .filter((item) => item.resultados?.some((resultado) => resultado.dataEncaixe === dataSolicitada));

  const resultados = lotesRelacionados.flatMap((item) =>
    item.resultados
      .filter(
        (resultado) =>
          resultado.dataEncaixe === dataSolicitada &&
          (!turnoSolicitado || resultado.turnoEncaixe === turnoSolicitado)
      )
      .map((resultado) => ({
        ...resultado,
        loteId: item.id,
        criadoEm: item.createdAt
      }))
  );

  resultados.sort((a, b) => {
    const rotaDiff = rotaParaOrdem(a.rota) - rotaParaOrdem(b.rota);

    if (rotaDiff !== 0) {
      return rotaDiff;
    }

    const horarioDiff = horarioParaMinutos(a.horarioEmbarque) - horarioParaMinutos(b.horarioEmbarque);

    if (horarioDiff !== 0) {
      return horarioDiff;
    }

    return a.colaborador.localeCompare(b.colaborador, 'pt-BR');
  });

  res.json({
    data: dataSolicitada,
    totalResultados: resultados.length,
    totalLotes: lotesRelacionados.length,
    resumoDia: criarResumoDoDia(resultados),
    resultados
  });
});

app.put('/api/history/:id', (req, res) => {
  const { id } = req.params;
  const { solicitante, dataEncaixe, rawInput } = req.body;

  if (!solicitante?.trim()) {
    res.status(400).json({ message: 'Solicitante é obrigatório.' });
    return;
  }

  if (!rawInput?.trim()) {
    res.status(400).json({ message: 'Informe a lista em lote para atualizar.' });
    return;
  }

  const indice = historico.findIndex((item) => item.id === id);

  if (indice === -1) {
    res.status(404).json({ message: 'Lote não encontrado.' });
    return;
  }

  const anterior = historico[indice];
  const atualizado = criarResumoEncaixe({
    id: anterior.id,
    createdAt: anterior.createdAt,
    solicitante,
    dataEncaixe,
    rawInput
  });

  historico[indice] = atualizado;
  database.saveHistory(historico);

  res.json({
    ...atualizado,
    totalOk: atualizado.resultados.filter((item) => item.status === 'ok').length
  });
});

app.delete('/api/history/:id', (req, res) => {
  const { id } = req.params;
  const tamanhoAnterior = historico.length;
  historico = historico.filter((item) => item.id !== id);

  if (historico.length === tamanhoAnterior) {
    res.status(404).json({ message: 'Lote não encontrado.' });
    return;
  }

  database.saveHistory(historico);
  res.json({ ok: true });
});

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    res.status(404).json({ message: 'Rota não encontrada.' });
    return;
  }

  res.sendFile(path.join(rootDir, 'dist', 'index.html'));
});

export function startServer(customPort = port) {
  return app.listen(customPort, () => {
    console.log(`CROWN ENCAIXES PRO rodando em http://localhost:${customPort}`);
  });
}

if (process.argv[1] === __filename) {
  startServer();
}
