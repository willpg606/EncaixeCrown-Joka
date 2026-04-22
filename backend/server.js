import cors from 'cors';
import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const storageDir = process.env.STORAGE_DIR
  ? path.resolve(process.env.STORAGE_DIR)
  : path.join(__dirname, 'storage');
const uploadsDir = path.join(storageDir, 'uploads');
const baseCachePath = path.join(storageDir, 'base-cache.json');
const historyPath = path.join(storageDir, 'history.json');

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

const readJsonFile = (filePath, fallback) => {
  try {
    if (!fs.existsSync(filePath)) {
      return fallback;
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

const writeJsonFile = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
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

const carregarBase = () => readJsonFile(baseCachePath, { rows: [], importedAt: null, fileName: '' });
const carregarHistorico = () => readJsonFile(historyPath, []);

const criarIndiceBase = (rows = []) => {
  const index = new Map();

  rows.forEach((row) => {
    index.set(row.id, row);
  });

  return index;
};

let baseAtual = carregarBase();
let baseIndex = criarIndiceBase(baseAtual.rows);
let historico = carregarHistorico();

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

app.use(express.static(path.join(rootDir, 'dist')));

app.get('/api/health', (_, res) => {
  res.json({ ok: true });
});

app.get('/api/base/status', (_, res) => {
  res.json({
    totalRegistros: baseAtual.rows.length,
    importedAt: baseAtual.importedAt,
    fileName: baseAtual.fileName
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

    const normalizados = rows.map((row) => {
      const idOriginal = row.ID || row.Id || row.id || '';
      const funcionario = row['FUNCIONÁRIO'] || row.FUNCIONARIO || row.Funcionario || row['FUNCIONARIO'] || '';
      const colaborador = extrairNomeETurno(idOriginal, funcionario);

      return {
        id: normalizarNome(String(idOriginal)),
        rota: String(row.ROTA || row.Rota || '').trim(),
        horarioEmbarque: formatarHorarioExcel(
          row['HORÁRIO EMBARQUE'] ||
            row['HORARIO EMBARQUE'] ||
            row['HORÁRIO DE EMBARQUE'] ||
            row.HORARIO_EMBARQUE ||
            ''
        ),
        pontoEmbarque: String(
          row['PONTO DE EMBARQUE'] || row.PONTO_EMBARQUE || row['PONTO EMBARQUE'] || ''
        ).trim(),
        funcionario: String(funcionario).trim(),
        nomeBusca: normalizarNome(limparNomeExibicao(colaborador.nome)),
        nomeExibicao: limparNomeExibicao(colaborador.nome),
        turno: colaborador.turno,
        nomeOriginal: String(funcionario || idOriginal).trim()
      };
    });

    baseAtual = {
      rows: normalizados.filter((item) => item.id),
      importedAt: new Date().toISOString(),
      fileName: req.file.originalname
    };

    baseIndex = criarIndiceBase(baseAtual.rows);
    writeJsonFile(baseCachePath, baseAtual);
    fs.unlinkSync(req.file.path);

    res.json({
      message: 'Base importada com sucesso.',
      totalRegistros: baseAtual.rows.length,
      importedAt: baseAtual.importedAt,
      fileName: baseAtual.fileName
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
  writeJsonFile(historyPath, historico);

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
      .filter((resultado) => resultado.dataEncaixe === dataSolicitada)
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
  writeJsonFile(historyPath, historico);

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

  writeJsonFile(historyPath, historico);
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
